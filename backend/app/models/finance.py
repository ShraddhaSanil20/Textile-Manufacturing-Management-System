import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, Float, DateTime, Enum as SQLEnum, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ExpenseCategory(str, enum.Enum):
    raw_materials = "raw_materials"
    dye_chemicals = "dye_chemicals"
    electricity = "electricity"
    labour = "labour"
    maintenance = "maintenance"
    transport = "transport"
    other = "other"

class PaymentMethod(str, enum.Enum):
    bank_transfer = "bank_transfer"
    cheque = "cheque"
    cash = "cash"
    credit = "credit"

class PaymentStatus(str, enum.Enum):
    received = "received"
    pending = "pending"

class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_expense_amount"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("customer_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    category: Mapped[ExpenseCategory] = mapped_column(
        SQLEnum(ExpenseCategory, name="expense_category_enum", native_enum=False),
        nullable=False,
        index=True
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    expense_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    order: Mapped[Optional["CustomerOrder"]] = relationship("CustomerOrder", back_populates="expenses")

class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="chk_payment_amount"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("customer_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    buyer_id: Mapped[int] = mapped_column(Integer, ForeignKey("buyers.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        SQLEnum(PaymentMethod, name="payment_method_enum", native_enum=False),
        nullable=False,
        default=PaymentMethod.bank_transfer
    )
    status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus, name="payment_status_enum", native_enum=False),
        nullable=False,
        default=PaymentStatus.pending,
        index=True
    )
    transaction_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    payment_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    order: Mapped["CustomerOrder"] = relationship("CustomerOrder", back_populates="payments")
    buyer: Mapped["Buyer"] = relationship("Buyer", back_populates="payments")
