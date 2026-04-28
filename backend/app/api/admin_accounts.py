import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_account, require_non_empty_role_or_token
from app.db.session import get_db
from app.models.account import Account
from app.models.counterparty import Counterparty
from app.models.lookups import LookupRoleCode
from app.schemas.accounts import AccountCreateIn, AccountListItem, AccountPatchIn, AdminSetPasswordIn
from app.core.security import hash_password
from app.services.audit import write_audit
from app.services.auth_tokens import revoke_all_refresh_sessions

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(actor: Account) -> None:
    if actor.role_code != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_only")


def _role_exists(db: Session, role_code: str) -> bool:
    return db.get(LookupRoleCode, role_code) is not None


def _counterparty_exists(db: Session, counterparty_uuid: uuid.UUID) -> bool:
    return db.get(Counterparty, counterparty_uuid) is not None


@router.get("/accounts", response_model=list[AccountListItem])
def list_accounts(
    db: Session = Depends(get_db),
    _role: None = Depends(require_non_empty_role_or_token),
    actor: Account = Depends(get_current_account),
    limit: int = Query(200, ge=1, le=500),
) -> list[Account]:
    _require_admin(actor)
    return list(
        db.scalars(select(Account).order_by(Account.created_at.desc()).limit(limit)).all()
    )


@router.post("/accounts", response_model=AccountListItem, status_code=status.HTTP_201_CREATED)
def create_account(
    payload: AccountCreateIn,
    db: Session = Depends(get_db),
    _role: None = Depends(require_non_empty_role_or_token),
    actor: Account = Depends(get_current_account),
) -> Account:
    _require_admin(actor)
    if not _role_exists(db, payload.role_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown_role_code")
    if payload.counterparty_uuid and not _counterparty_exists(db, payload.counterparty_uuid):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown_counterparty")
    row = Account(
        login=payload.login.strip(),
        password_hash=hash_password(payload.password),
        role_code=payload.role_code,
        last_name=payload.last_name.strip(),
        first_name=payload.first_name.strip(),
        middle_name=payload.middle_name.strip() if payload.middle_name else None,
        counterparty_uuid=payload.counterparty_uuid,
        phone=payload.phone.strip() if payload.phone else None,
        email=payload.email.strip() if payload.email else None,
        job_title=payload.job_title.strip() if payload.job_title else None,
        department_code=payload.department_code.strip() if payload.department_code else None,
        is_active=True,
    )
    db.add(row)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="login_already_exists"
        ) from e
    write_audit(
        db,
        account_uuid=actor.uuid,
        action="account_create",
        event_type="CREATE",
        entity_type="account",
        entity_uuid=row.uuid,
        old_data=None,
        new_data={
            "login": row.login,
            "role_code": row.role_code,
            "counterparty_uuid": str(row.counterparty_uuid) if row.counterparty_uuid else None,
        },
    )
    db.commit()
    db.refresh(row)
    return row


@router.patch("/accounts/{account_uuid}", response_model=AccountListItem)
def patch_account(
    account_uuid: uuid.UUID,
    payload: AccountPatchIn,
    db: Session = Depends(get_db),
    _role: None = Depends(require_non_empty_role_or_token),
    actor: Account = Depends(get_current_account),
) -> Account:
    _require_admin(actor)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_patch")
    row = db.get(Account, account_uuid)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="account_not_found")

    old_snapshot = {
        "role_code": row.role_code,
        "is_active": row.is_active,
        "last_name": row.last_name,
        "first_name": row.first_name,
        "middle_name": row.middle_name,
        "email": row.email,
    }

    if "role_code" in data:
        if not _role_exists(db, data["role_code"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown_role_code")
        if row.uuid == actor.uuid and data["role_code"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="cannot_remove_own_admin_role",
            )
    if data.get("is_active") is False and row.uuid == actor.uuid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot_deactivate_self")

    for key, val in data.items():
        if isinstance(val, str):
            val = val.strip()
            if key in ("middle_name", "email") and val == "":
                val = None
        setattr(row, key, val)

    if "role_code" in data or ("is_active" in data and data["is_active"] is False):
        revoke_all_refresh_sessions(db, row.uuid)

    write_audit(
        db,
        account_uuid=actor.uuid,
        action="account_update",
        event_type="UPDATE",
        entity_type="account",
        entity_uuid=row.uuid,
        old_data=old_snapshot,
        new_data=data,
    )
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="login_already_exists"
        ) from e
    db.refresh(row)
    return row


@router.post("/accounts/{account_uuid}/set-password", status_code=status.HTTP_204_NO_CONTENT)
def set_account_password(
    account_uuid: uuid.UUID,
    payload: AdminSetPasswordIn,
    db: Session = Depends(get_db),
    _role: None = Depends(require_non_empty_role_or_token),
    actor: Account = Depends(get_current_account),
) -> None:
    _require_admin(actor)
    row = db.get(Account, account_uuid)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="account_not_found")
    row.password_hash = hash_password(payload.new_password)
    revoke_all_refresh_sessions(db, row.uuid)
    write_audit(
        db,
        account_uuid=actor.uuid,
        action="account_set_password",
        event_type="UPDATE",
        entity_type="account",
        entity_uuid=row.uuid,
        old_data=None,
        new_data={"reset_by_admin": True},
    )
    db.commit()
