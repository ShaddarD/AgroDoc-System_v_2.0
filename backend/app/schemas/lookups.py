from pydantic import BaseModel, ConfigDict, Field


class LookupRoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    role_code: str
    description: str
    sort_order: int


class LookupStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status_code: str
    description: str


class LookupCodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    description: str


class LookupRoleCreate(BaseModel):
    role_code: str = Field(..., max_length=50)
    description: str = Field(..., max_length=255)
    sort_order: int = Field(default=0, ge=0, le=9999)
