from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TokenLoginRequest(BaseModel):
    login: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10, max_length=4000)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10, max_length=4000)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=200)
    new_password: str = Field(..., min_length=8, max_length=200)


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    uuid: UUID
    login: str
    role_code: str
    last_name: str
    first_name: str
    middle_name: str | None
    email: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int
    account: AccountOut
