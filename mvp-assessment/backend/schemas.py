from datetime import datetime

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


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
