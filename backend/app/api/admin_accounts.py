import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import String, asc, desc, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_account, require_non_empty_role_or_token
from app.db.session import get_db
from app.models.account import Account
from app.models.counterparty import Counterparty
from app.models.lookups import AccountModuleAccess, LookupAccessModule, LookupRoleCode
from app.schemas.accounts import (
    AccountCreateIn,
    AccountListItem,
    AccountModuleAccessOut,
    AccountModuleAccessPatchIn,
    AccountPatchIn,
    AdminSetPasswordIn,
)
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
    q: str | None = Query(default=None, max_length=100),
    role_code: str | None = Query(default=None, max_length=50),
    counterparty_uuid: uuid.UUID | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
) -> list[AccountListItem]:
    _require_admin(actor)
    sort_map = {
        "login": Account.login,
        "role": Account.role_code,
        "email": Account.email,
        "created_at": Account.created_at,
        "company": Counterparty.name_ru,
    }
    sort_col = sort_map.get(sort_by, Account.created_at)
    sort_expr = asc(sort_col) if sort_dir == "asc" else desc(sort_col)

    stmt = (
        select(Account, Counterparty.name_ru.label("counterparty_name"))
        .select_from(Account)
        .outerjoin(Counterparty, Counterparty.uuid == Account.counterparty_uuid)
    )
    if q:
        token = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Account.login.ilike(token),
                Account.first_name.ilike(token),
                Account.last_name.ilike(token),
                Account.email.ilike(token),
                Counterparty.name_ru.ilike(token),
            )
        )
    if role_code:
        stmt = stmt.where(Account.role_code == role_code)
    if counterparty_uuid:
        stmt = stmt.where(Account.counterparty_uuid == counterparty_uuid)
    if is_active is not None:
        stmt = stmt.where(Account.is_active == is_active)
    stmt = stmt.order_by(sort_expr, Account.created_at.desc()).limit(limit)
    rows = db.execute(stmt).all()
    return [
        AccountListItem(
            uuid=row.Account.uuid,
            login=row.Account.login,
            role_code=row.Account.role_code,
            first_name=row.Account.first_name,
            last_name=row.Account.last_name,
            counterparty_uuid=row.Account.counterparty_uuid,
            counterparty_name=row.counterparty_name,
            email=row.Account.email,
            is_active=row.Account.is_active,
            created_at=row.Account.created_at,
        )
        for row in rows
    ]


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
        "login": row.login,
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
    if "counterparty_uuid" in data and data["counterparty_uuid"] is not None:
        if not _counterparty_exists(db, data["counterparty_uuid"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unknown_counterparty")
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


@router.get("/accounts/{account_uuid}/module-access", response_model=list[AccountModuleAccessOut])
def get_account_module_access(
    account_uuid: uuid.UUID,
    db: Session = Depends(get_db),
    _role: None = Depends(require_non_empty_role_or_token),
    actor: Account = Depends(get_current_account),
) -> list[AccountModuleAccessOut]:
    _require_admin(actor)
    account = db.get(Account, account_uuid)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="account_not_found")
    modules = list(
        db.scalars(select(LookupAccessModule).order_by(LookupAccessModule.sort_order, LookupAccessModule.module_code)).all()
    )
    access_rows = list(
        db.scalars(select(AccountModuleAccess).where(AccountModuleAccess.account_uuid == account_uuid)).all()
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


@router.put("/accounts/{account_uuid}/module-access", response_model=list[AccountModuleAccessOut])
def put_account_module_access(
    account_uuid: uuid.UUID,
    payload: AccountModuleAccessPatchIn,
    db: Session = Depends(get_db),
    _role: None = Depends(require_non_empty_role_or_token),
    actor: Account = Depends(get_current_account),
) -> list[AccountModuleAccessOut]:
    _require_admin(actor)
    account = db.get(Account, account_uuid)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="account_not_found")
    modules = list(db.scalars(select(LookupAccessModule.module_code)).all())
    module_set = set(modules)
    incoming = {}
    for item in payload.items:
        if item.module_code not in module_set:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"unknown_module_code:{item.module_code}")
        incoming[item.module_code] = item
    existing = list(
        db.scalars(select(AccountModuleAccess).where(AccountModuleAccess.account_uuid == account_uuid)).all()
    )
    existing_by_code = {x.module_code: x for x in existing}
    for code in module_set:
        src = incoming.get(code)
        if src is None:
            if code in existing_by_code:
                db.delete(existing_by_code[code])
            continue
        row = existing_by_code.get(code)
        if row is None:
            row = AccountModuleAccess(
                account_uuid=account_uuid, module_code=code, can_read=src.can_read, can_write=src.can_write
            )
            db.add(row)
        else:
            row.can_read = src.can_read
            row.can_write = src.can_write
    write_audit(
        db,
        account_uuid=actor.uuid,
        action="account_module_access_update",
        event_type="UPDATE",
        entity_type="account",
        entity_uuid=account_uuid,
        old_data=None,
        new_data={"items": [x.model_dump() for x in payload.items]},
    )
    db.commit()
    return get_account_module_access(account_uuid, db, _role, actor)
