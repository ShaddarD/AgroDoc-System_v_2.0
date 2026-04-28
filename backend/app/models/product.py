import uuid as uuid_pkg
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    product_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    hs_code_tnved: Mapped[str] = mapped_column(String(20), nullable=False)
    product_name_ru: Mapped[str] = mapped_column(String(255), nullable=False)
    product_name_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    botanical_name_latin: Mapped[str | None] = mapped_column(String(255), nullable=True)
    regulatory_documents: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
