from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class FileRecordOut(BaseModel):
    uuid: UUID
    entity_type: str
    entity_uuid: UUID
    file_type: str
    file_name: str
    storage_path: str
    mime_type: str
    checksum: str | None
    size_bytes: int
    created_by: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FileRecordListItem(BaseModel):
    """List/detail view without storage path (internal)."""

    uuid: UUID
    entity_type: str
    entity_uuid: UUID
    file_type: str
    file_name: str
    mime_type: str
    checksum: str | None
    size_bytes: int
    created_by: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
