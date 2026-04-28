import uuid as uuid_pkg
from datetime import datetime

from sqlalchemy import DateTime, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StatusHistory(Base):
    __tablename__ = "status_history"

    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_uuid: Mapped[uuid_pkg.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    from_status_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status_code: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by: Mapped[uuid_pkg.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
