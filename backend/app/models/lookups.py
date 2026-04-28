import uuid as uuid_pkg

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LookupRoleCode(Base):
    __tablename__ = "lookup_role_codes"

    role_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class LookupStatusCode(Base):
    __tablename__ = "lookup_status_codes"

    status_code: Mapped[str] = mapped_column(String(50), primary_key=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)


class LookupSourceType(Base):
    __tablename__ = "lookup_source_types"

    code: Mapped[str] = mapped_column(String(50), primary_key=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)


class LookupFileType(Base):
    __tablename__ = "lookup_file_types"

    code: Mapped[str] = mapped_column(String(50), primary_key=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)


class LookupAccessModule(Base):
    __tablename__ = "lookup_access_modules"

    module_code: Mapped[str] = mapped_column(String(100), primary_key=True)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class AccountModuleAccess(Base):
    __tablename__ = "account_module_access"
    __table_args__ = (UniqueConstraint("account_uuid", "module_code", name="uq_account_module_access"),)

    uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    account_uuid: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.uuid", ondelete="CASCADE"), nullable=False
    )
    module_code: Mapped[str] = mapped_column(
        String(100), ForeignKey("lookup_access_modules.module_code", ondelete="CASCADE"), nullable=False
    )
    can_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    can_write: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
