import uuid as uuid_pkg

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_request_roles, require_admin_roles
from app.db.session import get_db
from app.models.counterparty import Counterparty
from app.models.lookups import LookupFileType, LookupRoleCode, LookupSourceType, LookupStatusCode
from app.schemas.lookups import (
    CounterpartyCreateIn,
    CounterpartyOut,
    CounterpartyPatchIn,
    LookupCodeOut,
    LookupRoleCreate,
    LookupRoleOut,
    LookupStatusOut,
)
from app.services.audit import write_audit

router = APIRouter(prefix="/lookups", tags=["lookups"])


@router.get("/roles", response_model=list[LookupRoleOut])
def list_roles(db: Session = Depends(get_db)) -> list[LookupRoleCode]:
    return list(db.scalars(select(LookupRoleCode).order_by(LookupRoleCode.sort_order)).all())


@router.get("/statuses", response_model=list[LookupStatusOut])
def list_statuses(db: Session = Depends(get_db)) -> list[LookupStatusCode]:
    return list(db.scalars(select(LookupStatusCode).order_by(LookupStatusCode.status_code)).all())


@router.get("/source-types", response_model=list[LookupCodeOut])
def list_source_types(db: Session = Depends(get_db)) -> list[LookupSourceType]:
    return list(db.scalars(select(LookupSourceType).order_by(LookupSourceType.code)).all())


@router.get("/file-types", response_model=list[LookupCodeOut])
def list_file_types(db: Session = Depends(get_db)) -> list[LookupFileType]:
    return list(db.scalars(select(LookupFileType).order_by(LookupFileType.code)).all())


@router.post("/roles", response_model=LookupRoleOut, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: LookupRoleCreate,
    db: Session = Depends(get_db),
    roles: list[str] = Depends(get_request_roles),
) -> LookupRoleCode:
    require_admin_roles(roles)
    existing = db.get(LookupRoleCode, payload.role_code)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="role_code_exists")

    row = LookupRoleCode(
        role_code=payload.role_code,
        description=payload.description,
        sort_order=payload.sort_order,
    )
    db.add(row)
    write_audit(
        db,
        account_uuid=None,
        action="lookup_role_create",
        event_type="CREATE",
        entity_type="lookup_role_codes",
        entity_uuid=uuid_pkg.uuid5(uuid_pkg.NAMESPACE_URL, f"role:{payload.role_code}"),
        old_data=None,
        new_data={"role_code": payload.role_code, "description": payload.description},
    )
    db.commit()
    db.refresh(row)
    return row


@router.get("/counterparties", response_model=list[CounterpartyOut])
def list_counterparties(db: Session = Depends(get_db)) -> list[Counterparty]:
    return list(db.scalars(select(Counterparty).order_by(Counterparty.name_ru)).all())


@router.post("/counterparties", response_model=CounterpartyOut, status_code=status.HTTP_201_CREATED)
def create_counterparty(
    payload: CounterpartyCreateIn,
    db: Session = Depends(get_db),
    roles: list[str] = Depends(get_request_roles),
) -> Counterparty:
    require_admin_roles(roles)
    row = Counterparty(
        name_ru=payload.name_ru.strip(),
        name_en=payload.name_en.strip() if payload.name_en else None,
        inn=payload.inn.strip() if payload.inn else None,
        kpp=payload.kpp.strip() if payload.kpp else None,
        ogrn=payload.ogrn.strip() if payload.ogrn else None,
        legal_address_ru=payload.legal_address_ru.strip() if payload.legal_address_ru else None,
        actual_address_ru=payload.actual_address_ru.strip() if payload.actual_address_ru else None,
        legal_address_en=payload.legal_address_en.strip() if payload.legal_address_en else None,
        actual_address_en=payload.actual_address_en.strip() if payload.actual_address_en else None,
        status_code=payload.status_code.strip(),
        is_active=payload.is_active,
    )
    db.add(row)
    db.flush()
    write_audit(
        db,
        account_uuid=None,
        action="counterparty_create",
        event_type="CREATE",
        entity_type="counterparty",
        entity_uuid=row.uuid,
        old_data=None,
        new_data={"name_ru": row.name_ru, "inn": row.inn, "is_active": row.is_active},
    )
    db.commit()
    db.refresh(row)
    return row


@router.patch("/counterparties/{counterparty_uuid}", response_model=CounterpartyOut)
def patch_counterparty(
    counterparty_uuid: uuid_pkg.UUID,
    payload: CounterpartyPatchIn,
    db: Session = Depends(get_db),
    roles: list[str] = Depends(get_request_roles),
) -> Counterparty:
    require_admin_roles(roles)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_patch")
    row = db.get(Counterparty, counterparty_uuid)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="counterparty_not_found")
    old_snapshot = {
        "name_ru": row.name_ru,
        "inn": row.inn,
        "is_active": row.is_active,
        "status_code": row.status_code,
    }
    for key, val in data.items():
        if isinstance(val, str):
            val = val.strip()
            if val == "":
                val = None
        setattr(row, key, val)
    write_audit(
        db,
        account_uuid=None,
        action="counterparty_update",
        event_type="UPDATE",
        entity_type="counterparty",
        entity_uuid=row.uuid,
        old_data=old_snapshot,
        new_data=data,
    )
    db.commit()
    db.refresh(row)
    return row


@router.delete("/counterparties/{counterparty_uuid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_counterparty(
    counterparty_uuid: uuid_pkg.UUID,
    db: Session = Depends(get_db),
    roles: list[str] = Depends(get_request_roles),
) -> None:
    require_admin_roles(roles)
    row = db.get(Counterparty, counterparty_uuid)
    if row is None:
        return
    old_snapshot = {"name_ru": row.name_ru, "inn": row.inn, "is_active": row.is_active}
    row.is_active = False
    row.status_code = "inactive"
    write_audit(
        db,
        account_uuid=None,
        action="counterparty_delete",
        event_type="DELETE",
        entity_type="counterparty",
        entity_uuid=row.uuid,
        old_data=old_snapshot,
        new_data={"is_active": False, "status_code": "inactive"},
    )
    db.commit()
