from sqlalchemy import Integer, String
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
