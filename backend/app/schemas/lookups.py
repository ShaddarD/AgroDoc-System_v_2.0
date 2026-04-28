from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID


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
