from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CertificateRegistryRowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    registry_number: str
    application_uuid: UUID | None
    bl_number: str | None
    bl_date: date | None
    weight_tons: float | None
    fss_number: str | None
    fss_issue_date: date | None
    fum: str | None
    quality_certificate: str | None
    pi: str | None
    health: str | None
    conclusion: str | None
    radio: str | None
    non_gmo: str | None
    soo: str | None
    wood: str | None
    created_at: datetime
    updated_at: datetime


class CertificateRegistryPatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bl_number: str | None = Field(None, max_length=100)
    bl_date: date | None = None
    weight_tons: float | None = None
    fss_number: str | None = Field(None, max_length=100)
    fss_issue_date: date | None = None
    fum: str | None = None
    quality_certificate: str | None = None
    pi: str | None = None
    health: str | None = None
    conclusion: str | None = None
    radio: str | None = None
    non_gmo: str | None = None
    soo: str | None = None
    wood: str | None = None


class CertificateRegistryListOut(BaseModel):
    items: list[CertificateRegistryRowOut]
    total: int


class CertificateRegistryImportOut(BaseModel):
    processed: int
    created: int
    updated: int
    linked: int
    errors: list[str]


class CertificateRegistryColumnWidthsOut(BaseModel):
    widths: dict[str, int]
    order: list[str]


class CertificateRegistryColumnWidthsIn(BaseModel):
    widths: dict[str, int]
    order: list[str] | None = None
