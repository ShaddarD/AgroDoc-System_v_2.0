from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ApplicationCreateRequest(BaseModel):
    source_type: str = Field(default="manual", max_length=50)
    payload: dict = Field(default_factory=dict)
    created_by: UUID | None = None


class ChangeStatusRequest(BaseModel):
    new_status: str = Field(..., max_length=50)
    user_uuid: UUID | None = None
    user_roles: list[str] | None = None
    comment: str | None = None


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    status_code: str
    source_type: str
    current_revision_uuid: UUID | None
    created_at: datetime
    updated_at: datetime


class ApplicationListResponse(BaseModel):
    items: list[ApplicationResponse]
    total: int
    page: int
    page_size: int
