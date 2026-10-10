import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.models.user import UserRole

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

class UserBase(BaseModel):
    full_name: str
    email: str
    role: UserRole

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v or not EMAIL_REGEX.match(v.strip()):
            raise ValueError("Invalid email format")
        return v.strip().lower()

class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: Optional[UserRole] = UserRole.buyer

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v or not EMAIL_REGEX.match(v.strip()):
            raise ValueError("Invalid email format")
        return v.strip().lower()

class UserRegister(BaseModel):
    full_name: str
    email: str
    password: str
    role: Optional[str] = None

    model_config = ConfigDict(extra="ignore")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if not v or not EMAIL_REGEX.match(v.strip()):
            raise ValueError("Invalid email format")
        return v.strip().lower()

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
