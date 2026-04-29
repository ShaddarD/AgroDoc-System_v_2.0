import uuid as uuid_pkg
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CertificateRegistryRow(Base):
    __tablename__ = "registry_certificates"

    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    registry_number: Mapped[str] = mapped_column(String(100), nullable=False)
    application_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.uuid", ondelete="SET NULL"), nullable=True
    )

    bl_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bl_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    weight_tons: Mapped[float | None] = mapped_column(Numeric(12, 3), nullable=True)
    fss_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fss_issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    fum: Mapped[str | None] = mapped_column(Text, nullable=True)
    quality_certificate: Mapped[str | None] = mapped_column(Text, nullable=True)
    pi: Mapped[str | None] = mapped_column(Text, nullable=True)
    health: Mapped[str | None] = mapped_column(Text, nullable=True)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
    radio: Mapped[str | None] = mapped_column(Text, nullable=True)
    non_gmo: Mapped[str | None] = mapped_column(Text, nullable=True)
    soo: Mapped[str | None] = mapped_column(Text, nullable=True)
    wood: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
