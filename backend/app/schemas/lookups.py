from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import date


class LookupRoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    role_code: str
    description: str
    sort_order: int


class LookupStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status_code: str
    description: str


class LookupCodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    description: str


class LookupRoleCreate(BaseModel):
    role_code: str = Field(..., max_length=50)
    description: str = Field(..., max_length=255)
    sort_order: int = Field(default=0, ge=0, le=9999)


class CounterpartyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    name_ru: str
    name_en: str | None
    inn: str | None
    kpp: str | None
    ogrn: str | None
    legal_address_ru: str | None
    actual_address_ru: str | None
    legal_address_en: str | None
    actual_address_en: str | None
    status_code: str
    is_active: bool


class CounterpartyCreateIn(BaseModel):
    name_ru: str = Field(..., min_length=1, max_length=255)
    name_en: str | None = Field(None, max_length=255)
    inn: str | None = Field(None, max_length=12)
    kpp: str | None = Field(None, max_length=9)
    ogrn: str | None = Field(None, max_length=15)
    legal_address_ru: str | None = None
    actual_address_ru: str | None = None
    legal_address_en: str | None = None
    actual_address_en: str | None = None
    status_code: str = Field(default="active", max_length=50)
    is_active: bool = True


class CounterpartyPatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name_ru: str | None = Field(None, min_length=1, max_length=255)
    name_en: str | None = Field(None, max_length=255)
    inn: str | None = Field(None, max_length=12)
    kpp: str | None = Field(None, max_length=9)
    ogrn: str | None = Field(None, max_length=15)
    legal_address_ru: str | None = None
    actual_address_ru: str | None = None
    legal_address_en: str | None = None
    actual_address_en: str | None = None
    status_code: str | None = Field(None, max_length=50)
    is_active: bool | None = None


class ShippingLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    code: str
    name_ru: str
    name_en: str
    is_active: bool


class ShippingLineCreateIn(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)
    name_ru: str = Field(..., min_length=1, max_length=255)
    name_en: str = Field(default="", max_length=255)
    is_active: bool = True


class ShippingLinePatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str | None = Field(None, min_length=1, max_length=20)
    name_ru: str | None = Field(None, min_length=1, max_length=255)
    name_en: str | None = Field(None, max_length=255)
    is_active: bool | None = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    product_code: str
    hs_code_tnved: str
    product_name_ru: str
    product_name_en: str | None
    botanical_name_latin: str | None
    regulatory_documents: str | None
    is_active: bool


class ProductCreateIn(BaseModel):
    product_code: str = Field(..., min_length=1, max_length=50)
    hs_code_tnved: str = Field(..., min_length=1, max_length=20)
    product_name_ru: str = Field(..., min_length=1, max_length=255)
    product_name_en: str | None = Field(None, max_length=255)
    botanical_name_latin: str | None = Field(None, max_length=255)
    regulatory_documents: str | None = None
    is_active: bool = True


class ProductPatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_code: str | None = Field(None, min_length=1, max_length=50)
    hs_code_tnved: str | None = Field(None, min_length=1, max_length=20)
    product_name_ru: str | None = Field(None, min_length=1, max_length=255)
    product_name_en: str | None = Field(None, max_length=255)
    botanical_name_latin: str | None = Field(None, max_length=255)
    regulatory_documents: str | None = None
    is_active: bool | None = None


class TerminalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    terminal_code: str
    terminal_name: str
    owner_counterparty_uuid: UUID | None
    address_ru: str
    address_en: str | None
    is_active: bool


class TerminalCreateIn(BaseModel):
    terminal_code: str = Field(..., min_length=1, max_length=50)
    terminal_name: str = Field(..., min_length=1, max_length=255)
    owner_counterparty_uuid: UUID | None = None
    address_ru: str = Field(..., min_length=1)
    address_en: str | None = None
    is_active: bool = True


class TerminalPatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    terminal_code: str | None = Field(None, min_length=1, max_length=50)
    terminal_name: str | None = Field(None, min_length=1, max_length=255)
    owner_counterparty_uuid: UUID | None = None
    address_ru: str | None = Field(None, min_length=1)
    address_en: str | None = None
    is_active: bool | None = None


class PowerOfAttorneyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    poa_number: str
    issue_date: date
    validity_years: int
    principal_counterparty_uuid: UUID | None
    attorney_counterparty_uuid: UUID | None
    status_code: str
    is_active: bool


class PowerOfAttorneyCreateIn(BaseModel):
    poa_number: str = Field(..., min_length=1, max_length=100)
    issue_date: date
    validity_years: int = Field(..., ge=1, le=20)
    principal_counterparty_uuid: UUID | None = None
    attorney_counterparty_uuid: UUID | None = None
    status_code: str = Field(default="active", max_length=50)
    is_active: bool = True


class PowerOfAttorneyPatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    poa_number: str | None = Field(None, min_length=1, max_length=100)
    issue_date: date | None = None
    validity_years: int | None = Field(None, ge=1, le=20)
    principal_counterparty_uuid: UUID | None = None
    attorney_counterparty_uuid: UUID | None = None
    status_code: str | None = Field(None, max_length=50)
    is_active: bool | None = None
