from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ApplicationCreateRequest(BaseModel):
    source_type: str = Field(default="manual", max_length=50)
    payload: dict = Field(default_factory=dict)
    created_by: UUID | None = None


class ApplicationPatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    application_number: str | None = Field(None, max_length=100)
    application_type_code: str | None = Field(None, max_length=50)
    laboratory_uuid: UUID | None = None
    applicant_counterparty_uuid: UUID | None = None
    assigned_to: UUID | None = None
    terminal_uuid: UUID | None = None
    product_uuid: UUID | None = None
    power_of_attorney_uuid: UUID | None = None
    stuffing_act_uuid: UUID | None = None
    master_application_uuid: UUID | None = None
    container_count_snapshot: int | None = None
    places_snapshot: int | None = None
    notes: str | None = None
    exporter_name_ru: str | None = None
    importer_name: str | None = None
    weight_tons: float | None = None
    destination_place_ru: str | None = None
    destination_place_en: str | None = None
    izveshenie: str | None = None
    fss_number: str | None = Field(None, max_length=100)
    fss_issue_date: date | None = None
    bill_of_lading_number: str | None = Field(None, max_length=100)
    bill_of_lading_date: date | None = None
    notes_in_table: str | None = None
    fss_plan_issue_date: date | None = None


class ChangeStatusRequest(BaseModel):
    new_status: str = Field(..., max_length=50)
    user_uuid: UUID | None = None
    user_roles: list[str] | None = None
    comment: str | None = None


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    application_number: str | None
    application_type_code: str
    laboratory_uuid: UUID | None
    status_code: str
    source_type: str
    applicant_counterparty_uuid: UUID | None
    assigned_to: UUID | None
    terminal_uuid: UUID | None
    product_uuid: UUID | None
    stuffing_act_uuid: UUID | None
    master_application_uuid: UUID | None
    container_count_snapshot: int | None
    places_snapshot: int | None
    notes: str | None
    exporter_name_ru: str | None
    importer_name: str | None
    weight_tons: float | None
    destination_place_ru: str | None
    destination_place_en: str | None
    izveshenie: str | None
    fss_number: str | None
    fss_issue_date: date | None
    bill_of_lading_number: str | None
    bill_of_lading_date: date | None
    notes_in_table: str | None
    fss_plan_issue_date: date | None
    current_revision_uuid: UUID | None
    created_at: datetime
    updated_at: datetime


class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int
    page: int
    page_size: int
