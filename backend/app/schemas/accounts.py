from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AccountListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    login: str
    role_code: str
    first_name: str
    last_name: str
    email: str | None
    is_active: bool
    created_at: datetime


class AccountCreateIn(BaseModel):
    login: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=200)
    role_code: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=100)
    first_name: str = Field(..., min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    email: str | None = Field(None, max_length=255)


class AccountPatchIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role_code: str | None = Field(None, min_length=1, max_length=50)
    is_active: bool | None = None
    last_name: str | None = Field(None, min_length=1, max_length=100)
    first_name: str | None = Field(None, min_length=1, max_length=100)
    middle_name: str | None = Field(None, max_length=100)
    email: str | None = Field(None, max_length=255)


class AdminSetPasswordIn(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=200)
