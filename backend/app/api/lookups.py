import uuid as uuid_pkg

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_request_roles, require_admin_roles
from app.db.session import get_db
from app.models.lookups import LookupFileType, LookupRoleCode, LookupSourceType, LookupStatusCode
from app.schemas.lookups import LookupCodeOut, LookupRoleCreate, LookupRoleOut, LookupStatusOut
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
