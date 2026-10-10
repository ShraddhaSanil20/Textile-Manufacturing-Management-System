import enum
from datetime import datetime, timezone
from sqlalchemy import Integer, String, Boolean, DateTime, Enum as SQLEnum, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class UserRole(str, enum.Enum):
    admin = "admin"
    store_manager = "store_manager"
    production_operator = "production_operator"
    quality_inspector = "quality_inspector"
    accounts = "accounts"
    buyer = "buyer"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="user_role_enum", native_enum=False),
        nullable=False,
        default=UserRole.buyer
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
