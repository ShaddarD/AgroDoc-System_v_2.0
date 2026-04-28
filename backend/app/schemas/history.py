from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ApplicationRevisionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    version: int
    data: dict[str, Any]
    created_by: UUID | None
    created_at: datetime


class AuditLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    account_uuid: UUID | None
    action: str
    event_type: str
    entity_type: str
    entity_uuid: UUID
    old_data: dict[str, Any] | None
    new_data: dict[str, Any] | None
    created_at: datetime


class RevisionPage(BaseModel):
    items: list[ApplicationRevisionItem]
    total: int
    page: int
    page_size: int


class AuditPage(BaseModel):
    items: list[AuditLogItem]
    total: int
    page: int
    page_size: int


class AdjacentRevisionsOut(BaseModel):
    """Текущая ревизия и предыдущая по номеру версии (для диффа при пагинации списка)."""

    current: ApplicationRevisionItem
    previous: ApplicationRevisionItem | None
