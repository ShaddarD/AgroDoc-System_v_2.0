import uuid as uuid_pkg
from datetime import date, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Application(Base):
    __tablename__ = "applications"

    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    application_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    application_type_code: Mapped[str] = mapped_column(String(50), nullable=False, default="vnikkr")
    laboratory_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lookup_laboratories.uuid"), nullable=True
    )
    status_code: Mapped[str] = mapped_column(String(50), nullable=False, default="CREATED")
    source_type: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    source_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    applicant_counterparty_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("counterparties.uuid"), nullable=True
    )
    applicant_account_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.uuid"),
        nullable=True,
    )
    assigned_to: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounts.uuid"),
        nullable=True,
    )
    terminal_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("terminals.uuid"), nullable=True
    )
    product_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.uuid"), nullable=True
    )
    power_of_attorney_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("powers_of_attorney.uuid"), nullable=True
    )
    stuffing_act_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("akt_zatarki.uuid"), nullable=True
    )
    master_application_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("applications.uuid"), nullable=True
    )
    containers_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    container_count_snapshot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cargo_places_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    places_snapshot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    destination_place_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    destination_place_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    izveshenie: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes_in_table: Mapped[str | None] = mapped_column(Text, nullable=True)
    fss_plan_issue_date: Mapped[date | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_revision_uuid: Mapped[uuid_pkg.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("application_revisions.uuid", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
