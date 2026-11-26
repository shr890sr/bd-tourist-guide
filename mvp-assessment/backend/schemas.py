from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: str
    is_banned: bool
    created_at: datetime


class AuditLogRead(BaseModel):
    id: int
    user_id: int | None
    user_email: EmailStr | None
    action: str
    details: str
    timestamp: datetime
    ip_address: str | None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    email: EmailStr


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class GroupMemberAdd(BaseModel):
    email: EmailStr
    role: Literal["admin", "member"] = "member"


class GroupMemberRead(BaseModel):
    user_id: int
    email: EmailStr
    role: Literal["admin", "member"]


class GroupRead(BaseModel):
    id: int
    name: str
    owner_id: int
    members: list[GroupMemberRead]


class DestinationFields(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=5, max_length=5000)
    location: str = Field(min_length=2, max_length=160)
    image_url: HttpUrl | None = None


class DestinationCreate(DestinationFields):
    pass


class DestinationUpdate(DestinationFields):
    pass


class DestinationRead(DestinationFields):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int | None = None
