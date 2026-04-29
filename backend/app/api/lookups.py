import uuid as uuid_pkg

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import RequestAuth, get_request_auth, get_request_roles, require_admin_roles, require_module_access
from app.db.session import get_db
from app.models.counterparty import Counterparty
from app.models.lookups import LookupFileType, LookupLaboratory, LookupRoleCode, LookupSourceType, LookupStatusCode
from app.models.power_of_attorney import PowerOfAttorney
from app.models.product import Product
from app.models.shipping_line import ShippingLine
from app.models.terminal import Terminal
from app.schemas.lookups import (
    CounterpartyCreateIn,
    CounterpartyOut,
    CounterpartyPatchIn,
    LookupCodeOut,
    LookupLaboratoryOut,
    LookupRoleCreate,
    LookupRoleOut,
    LookupStatusOut,
    PowerOfAttorneyCreateIn,
    PowerOfAttorneyOut,
    PowerOfAttorneyPatchIn,
    ProductCreateIn,
    ProductOut,
    ProductPatchIn,
    ShippingLineCreateIn,
    ShippingLineOut,
    ShippingLinePatchIn,
    TerminalCreateIn,
    TerminalOut,
    TerminalPatchIn,
)
from app.services.audit import write_audit

router = APIRouter(prefix="/lookups", tags=["lookups"])

LOOKUP_MODULE_CODES = {
    "counterparties": "lookups_counterparties",
    "shipping_lines": "lookups_shipping_lines",
    "products": "lookups_products",
    "terminals": "lookups_terminals",
    "powers_of_attorney": "lookups_powers_of_attorney",
}


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


@router.get("/laboratories", response_model=list[LookupLaboratoryOut])
def list_laboratories(db: Session = Depends(get_db)) -> list[LookupLaboratory]:
    return list(
        db.scalars(
            select(LookupLaboratory)
            .where(LookupLaboratory.is_active.is_(True))
            .order_by(LookupLaboratory.lab_rus)
        ).all()
    )


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
def list_counterparties(
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> list[Counterparty]:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["counterparties"],
        need_write=False,
    )
    return list(db.scalars(select(Counterparty).order_by(Counterparty.name_ru)).all())


@router.post("/counterparties", response_model=CounterpartyOut, status_code=status.HTTP_201_CREATED)
def create_counterparty(
    payload: CounterpartyCreateIn,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> Counterparty:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["counterparties"],
        need_write=True,
    )
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
    request_auth: RequestAuth = Depends(get_request_auth),
) -> Counterparty:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["counterparties"],
        need_write=True,
    )
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
    request_auth: RequestAuth = Depends(get_request_auth),
) -> None:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["counterparties"],
        need_write=True,
    )
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


@router.get("/shipping-lines", response_model=list[ShippingLineOut])
def list_shipping_lines(
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> list[ShippingLine]:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["shipping_lines"],
        need_write=False,
    )
    return list(db.scalars(select(ShippingLine).order_by(ShippingLine.code)).all())


@router.post("/shipping-lines", response_model=ShippingLineOut, status_code=status.HTTP_201_CREATED)
def create_shipping_line(
    payload: ShippingLineCreateIn,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> ShippingLine:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["shipping_lines"],
        need_write=True,
    )
    row = ShippingLine(
        code=payload.code.strip(),
        name_ru=payload.name_ru.strip(),
        name_en=payload.name_en.strip(),
        is_active=payload.is_active,
    )
    db.add(row)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="shipping_line_code_exists") from e
    write_audit(
        db,
        account_uuid=None,
        action="shipping_line_create",
        event_type="CREATE",
        entity_type="shipping_line",
        entity_uuid=row.uuid,
        old_data=None,
        new_data={"code": row.code, "name_ru": row.name_ru},
    )
    db.commit()
    db.refresh(row)
    return row


@router.patch("/shipping-lines/{line_uuid}", response_model=ShippingLineOut)
def patch_shipping_line(
    line_uuid: uuid_pkg.UUID,
    payload: ShippingLinePatchIn,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> ShippingLine:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["shipping_lines"],
        need_write=True,
    )
    row = db.get(ShippingLine, line_uuid)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="shipping_line_not_found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_patch")
    old_data = {"code": row.code, "name_ru": row.name_ru, "name_en": row.name_en, "is_active": row.is_active}
    for key, val in data.items():
        if isinstance(val, str):
            val = val.strip()
        setattr(row, key, val)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="shipping_line_code_exists") from e
    write_audit(
        db,
        account_uuid=None,
        action="shipping_line_update",
        event_type="UPDATE",
        entity_type="shipping_line",
        entity_uuid=row.uuid,
        old_data=old_data,
        new_data=data,
    )
    db.commit()
    db.refresh(row)
    return row


@router.delete("/shipping-lines/{line_uuid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shipping_line(
    line_uuid: uuid_pkg.UUID,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> None:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["shipping_lines"],
        need_write=True,
    )
    row = db.get(ShippingLine, line_uuid)
    if row is None:
        return
    old_data = {"code": row.code, "is_active": row.is_active}
    row.is_active = False
    write_audit(
        db,
        account_uuid=None,
        action="shipping_line_delete",
        event_type="DELETE",
        entity_type="shipping_line",
        entity_uuid=row.uuid,
        old_data=old_data,
        new_data={"is_active": False},
    )
    db.commit()


@router.get("/products", response_model=list[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> list[Product]:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["products"],
        need_write=False,
    )
    return list(db.scalars(select(Product).order_by(Product.product_code)).all())


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreateIn,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> Product:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["products"],
        need_write=True,
    )
    row = Product(
        product_code=payload.product_code.strip(),
        hs_code_tnved=payload.hs_code_tnved.strip(),
        product_name_ru=payload.product_name_ru.strip(),
        product_name_en=payload.product_name_en.strip() if payload.product_name_en else None,
        botanical_name_latin=payload.botanical_name_latin.strip() if payload.botanical_name_latin else None,
        regulatory_documents=payload.regulatory_documents.strip() if payload.regulatory_documents else None,
        is_active=payload.is_active,
    )
    db.add(row)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="product_code_exists") from e
    write_audit(
        db,
        account_uuid=None,
        action="product_create",
        event_type="CREATE",
        entity_type="product",
        entity_uuid=row.uuid,
        old_data=None,
        new_data={"product_code": row.product_code, "product_name_ru": row.product_name_ru},
    )
    db.commit()
    db.refresh(row)
    return row


@router.patch("/products/{product_uuid}", response_model=ProductOut)
def patch_product(
    product_uuid: uuid_pkg.UUID,
    payload: ProductPatchIn,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> Product:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["products"],
        need_write=True,
    )
    row = db.get(Product, product_uuid)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="product_not_found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_patch")
    old_data = {
        "product_code": row.product_code,
        "hs_code_tnved": row.hs_code_tnved,
        "product_name_ru": row.product_name_ru,
        "is_active": row.is_active,
    }
    for key, val in data.items():
        if isinstance(val, str):
            val = val.strip()
            if val == "":
                val = None
        setattr(row, key, val)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="product_code_exists") from e
    write_audit(
        db,
        account_uuid=None,
        action="product_update",
        event_type="UPDATE",
        entity_type="product",
        entity_uuid=row.uuid,
        old_data=old_data,
        new_data=data,
    )
    db.commit()
    db.refresh(row)
    return row


@router.delete("/products/{product_uuid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_uuid: uuid_pkg.UUID,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> None:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["products"],
        need_write=True,
    )
    row = db.get(Product, product_uuid)
    if row is None:
        return
    old_data = {"product_code": row.product_code, "is_active": row.is_active}
    row.is_active = False
    write_audit(
        db,
        account_uuid=None,
        action="product_delete",
        event_type="DELETE",
        entity_type="product",
        entity_uuid=row.uuid,
        old_data=old_data,
        new_data={"is_active": False},
    )
    db.commit()


@router.get("/terminals", response_model=list[TerminalOut])
def list_terminals(
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> list[Terminal]:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["terminals"],
        need_write=False,
    )
    return list(db.scalars(select(Terminal).order_by(Terminal.terminal_code)).all())


@router.post("/terminals", response_model=TerminalOut, status_code=status.HTTP_201_CREATED)
def create_terminal(
    payload: TerminalCreateIn,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> Terminal:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["terminals"],
        need_write=True,
    )
    row = Terminal(
        terminal_code=payload.terminal_code.strip(),
        terminal_name=payload.terminal_name.strip(),
        address_ru=payload.address_ru.strip(),
        address_en=payload.address_en.strip() if payload.address_en else None,
        is_active=payload.is_active,
    )
    db.add(row)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="terminal_code_exists") from e
    write_audit(
        db,
        account_uuid=None,
        action="terminal_create",
        event_type="CREATE",
        entity_type="terminal",
        entity_uuid=row.uuid,
        old_data=None,
        new_data={"terminal_code": row.terminal_code, "terminal_name": row.terminal_name},
    )
    db.commit()
    db.refresh(row)
    return row


@router.patch("/terminals/{terminal_uuid}", response_model=TerminalOut)
def patch_terminal(
    terminal_uuid: uuid_pkg.UUID,
    payload: TerminalPatchIn,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> Terminal:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["terminals"],
        need_write=True,
    )
    row = db.get(Terminal, terminal_uuid)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="terminal_not_found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_patch")
    old_data = {
        "terminal_code": row.terminal_code,
        "terminal_name": row.terminal_name,
        "is_active": row.is_active,
    }
    for key, val in data.items():
        if isinstance(val, str):
            val = val.strip()
            if val == "":
                val = None
        setattr(row, key, val)
    try:
        db.flush()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="terminal_code_exists") from e
    write_audit(
        db,
        account_uuid=None,
        action="terminal_update",
        event_type="UPDATE",
        entity_type="terminal",
        entity_uuid=row.uuid,
        old_data=old_data,
        new_data=data,
    )
    db.commit()
    db.refresh(row)
    return row


@router.delete("/terminals/{terminal_uuid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_terminal(
    terminal_uuid: uuid_pkg.UUID,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> None:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["terminals"],
        need_write=True,
    )
    row = db.get(Terminal, terminal_uuid)
    if row is None:
        return
    old_data = {"terminal_code": row.terminal_code, "is_active": row.is_active}
    row.is_active = False
    write_audit(
        db,
        account_uuid=None,
        action="terminal_delete",
        event_type="DELETE",
        entity_type="terminal",
        entity_uuid=row.uuid,
        old_data=old_data,
        new_data={"is_active": False},
    )
    db.commit()


@router.get("/powers-of-attorney", response_model=list[PowerOfAttorneyOut])
def list_powers_of_attorney(
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> list[PowerOfAttorney]:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["powers_of_attorney"],
        need_write=False,
    )
    return list(db.scalars(select(PowerOfAttorney).order_by(PowerOfAttorney.issue_date.desc())).all())


@router.post("/powers-of-attorney", response_model=PowerOfAttorneyOut, status_code=status.HTTP_201_CREATED)
def create_power_of_attorney(
    payload: PowerOfAttorneyCreateIn,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> PowerOfAttorney:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["powers_of_attorney"],
        need_write=True,
    )
    row = PowerOfAttorney(
        poa_number=payload.poa_number.strip(),
        issue_date=payload.issue_date,
        validity_years=payload.validity_years,
        principal_counterparty_uuid=payload.principal_counterparty_uuid,
        attorney_counterparty_uuid=payload.attorney_counterparty_uuid,
        status_code=payload.status_code.strip(),
        is_active=payload.is_active,
    )
    db.add(row)
    db.flush()
    write_audit(
        db,
        account_uuid=None,
        action="power_of_attorney_create",
        event_type="CREATE",
        entity_type="power_of_attorney",
        entity_uuid=row.uuid,
        old_data=None,
        new_data={"poa_number": row.poa_number, "status_code": row.status_code},
    )
    db.commit()
    db.refresh(row)
    return row


@router.patch("/powers-of-attorney/{poa_uuid}", response_model=PowerOfAttorneyOut)
def patch_power_of_attorney(
    poa_uuid: uuid_pkg.UUID,
    payload: PowerOfAttorneyPatchIn,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> PowerOfAttorney:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["powers_of_attorney"],
        need_write=True,
    )
    row = db.get(PowerOfAttorney, poa_uuid)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="power_of_attorney_not_found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_patch")
    old_data = {"poa_number": row.poa_number, "status_code": row.status_code, "is_active": row.is_active}
    for key, val in data.items():
        if isinstance(val, str):
            val = val.strip()
            if val == "":
                val = None
        setattr(row, key, val)
    write_audit(
        db,
        account_uuid=None,
        action="power_of_attorney_update",
        event_type="UPDATE",
        entity_type="power_of_attorney",
        entity_uuid=row.uuid,
        old_data=old_data,
        new_data=data,
    )
    db.commit()
    db.refresh(row)
    return row


@router.delete("/powers-of-attorney/{poa_uuid}", status_code=status.HTTP_204_NO_CONTENT)
def delete_power_of_attorney(
    poa_uuid: uuid_pkg.UUID,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> None:
    require_module_access(
        db=db,
        account=request_auth.account,
        roles=request_auth.roles,
        module_code=LOOKUP_MODULE_CODES["powers_of_attorney"],
        need_write=True,
    )
    row = db.get(PowerOfAttorney, poa_uuid)
    if row is None:
        return
    old_data = {"poa_number": row.poa_number, "is_active": row.is_active}
    row.is_active = False
    row.status_code = "inactive"
    write_audit(
        db,
        account_uuid=None,
        action="power_of_attorney_delete",
        event_type="DELETE",
        entity_type="power_of_attorney",
        entity_uuid=row.uuid,
        old_data=old_data,
        new_data={"is_active": False, "status_code": row.status_code},
    )
    db.commit()
