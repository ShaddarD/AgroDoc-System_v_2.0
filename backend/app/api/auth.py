import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.api.deps import get_current_account
from app.core.config import settings
from app.core.security import decode_token, hash_password, verify_password
from app.db.session import get_db
from app.models.account import Account
from app.models.auth_refresh_session import AuthRefreshSession
from app.models.lookups import AccountModuleAccess, LookupAccessModule
from app.schemas.accounts import AccountModuleAccessOut
from app.schemas.auth import (
    AccountOut,
    ChangePasswordRequest,
    LogoutRequest,
    RefreshSessionOut,
    RefreshTokenRequest,
    RevokeSessionRequest,
    TokenLoginRequest,
    TokenOut,
)
from app.services.audit import write_audit
from app.services.auth_tokens import issue_token_pair, revoke_all_refresh_sessions

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=TokenOut)
def login(
    payload: TokenLoginRequest,
    db: Session = Depends(get_db),
) -> TokenOut:
    row = db.scalars(
        select(Account).where(Account.login == payload.login).limit(1)
    ).first()
    if row is None or not row.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_login_or_password")
    if not verify_password(payload.password, row.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_login_or_password")

    out = issue_token_pair(db, row)
    db.commit()
    db.refresh(row)
    return {
        **out,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=TokenOut)
def refresh_session(payload: RefreshTokenRequest, db: Session = Depends(get_db)) -> TokenOut:
    try:
        body = decode_token(
            payload.refresh_token,
            secret=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_or_expired_refresh"
        ) from None
    if body.get("typ") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_or_expired_refresh"
        )
    sub = body.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_missing_sub")
    try:
        acc_id = uuid.UUID(str(sub))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="token_invalid_subject"
        ) from e
    row = db.get(Account, acc_id)
    if row is None or not row.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="account_inactive")

    jti_raw = body.get("jti")
    now = datetime.now(UTC)
    if jti_raw:
        try:
            jti = uuid.UUID(str(jti_raw))
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_or_expired_refresh"
            ) from e
        sess = db.get(AuthRefreshSession, jti)
        if (
            sess is None
            or sess.account_uuid != row.uuid
            or sess.revoked_at is not None
            or sess.expires_at < now
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_or_expired_refresh"
            )
        sess.revoked_at = now

    out = issue_token_pair(db, row)
    db.commit()
    db.refresh(row)
    return {
        **out,
        "token_type": "bearer",
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout_refresh(payload: LogoutRequest, db: Session = Depends(get_db)) -> None:
    try:
        body = decode_token(
            payload.refresh_token,
            secret=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )
    except JWTError:
        return
    if body.get("typ") != "refresh":
        return
    jti_raw = body.get("jti")
    if not jti_raw:
        return
    try:
        jti = uuid.UUID(str(jti_raw))
    except ValueError:
        return
    sess = db.get(AuthRefreshSession, jti)
    if sess is not None and sess.revoked_at is None:
        sess.revoked_at = datetime.now(UTC)
        db.commit()


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_own_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
) -> None:
    if not verify_password(payload.current_password, account.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_current_password"
        )
    account.password_hash = hash_password(payload.new_password)
    revoke_all_refresh_sessions(db, account.uuid)
    write_audit(
        db,
        account_uuid=account.uuid,
        action="password_change_self",
        event_type="UPDATE",
        entity_type="account",
        entity_uuid=account.uuid,
        old_data=None,
        new_data={"self_service": True},
    )
    db.commit()


@router.get("/me", response_model=AccountOut)
def me(
    account: Account = Depends(get_current_account),
) -> Account:
    return account


@router.get("/me/module-access", response_model=list[AccountModuleAccessOut])
def my_module_access(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
) -> list[AccountModuleAccessOut]:
    modules = list(
        db.scalars(select(LookupAccessModule).order_by(LookupAccessModule.sort_order, LookupAccessModule.module_code)).all()
    )
    access_rows = list(
        db.scalars(select(AccountModuleAccess).where(AccountModuleAccess.account_uuid == account.uuid)).all()
    )
    index = {x.module_code: x for x in access_rows}
    return [
        AccountModuleAccessOut(
            module_code=m.module_code,
            module_description=m.description,
            can_read=index[m.module_code].can_read if m.module_code in index else False,
            can_write=index[m.module_code].can_write if m.module_code in index else False,
        )
        for m in modules
    ]


@router.get("/sessions", response_model=list[RefreshSessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
) -> list[AuthRefreshSession]:
    return list(
        db.scalars(
            select(AuthRefreshSession)
            .where(AuthRefreshSession.account_uuid == account.uuid)
            .order_by(AuthRefreshSession.created_at.desc())
            .limit(200)
        ).all()
    )


@router.post("/sessions/revoke", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    payload: RevokeSessionRequest,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
) -> None:
    sess = db.get(AuthRefreshSession, payload.jti)
    if sess is None or sess.account_uuid != account.uuid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session_not_found")
    if sess.revoked_at is None:
        sess.revoked_at = datetime.now(UTC)
        db.commit()


@router.post("/sessions/revoke-others", status_code=status.HTTP_204_NO_CONTENT)
def revoke_other_sessions(
    payload: RevokeSessionRequest,
    db: Session = Depends(get_db),
    account: Account = Depends(get_current_account),
) -> None:
    db.execute(
        update(AuthRefreshSession)
        .where(
            AuthRefreshSession.account_uuid == account.uuid,
            AuthRefreshSession.jti != payload.jti,
            AuthRefreshSession.revoked_at.is_(None),
        )
        .values(revoked_at=datetime.now(UTC))
    )
    db.commit()
