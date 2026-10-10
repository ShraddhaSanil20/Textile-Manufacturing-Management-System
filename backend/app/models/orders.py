import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Integer, String, Float, DateTime, Enum as SQLEnum, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class OrderStatus(str, enum.Enum):
    created = "created"
    material_check = "material_check"
    in_production = "in_production"
    quality_check = "quality_check"
    ready_to_ship = "ready_to_ship"
    dispatched = "dispatched"
    completed = "completed"

class Buyer(Base):
    __tablename__ = "buyers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User")
    orders: Mapped[List["CustomerOrder"]] = relationship("CustomerOrder", back_populates="buyer")
    dispatches: Mapped[List["Dispatch"]] = relationship("Dispatch", back_populates="buyer")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="buyer")

class CustomerOrder(Base):
    __tablename__ = "customer_orders"
    __table_args__ = (
        CheckConstraint("quantity_metres > 0", name="chk_order_quantity"),
        CheckConstraint("unit_price >= 0", name="chk_order_unit_price"),
        CheckConstraint("total_revenue >= 0", name="chk_order_total_revenue"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    buyer_id: Mapped[int] = mapped_column(Integer, ForeignKey("buyers.id", ondelete="RESTRICT"), nullable=False, index=True)
    fabric_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    colour: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity_metres: Mapped[float] = mapped_column(Float, nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus, name="order_status_enum", native_enum=False),
        nullable=False,
        default=OrderStatus.created,
        index=True
    )
    unit_price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_revenue: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    buyer: Mapped["Buyer"] = relationship("Buyer", back_populates="orders")
    stock_movements: Mapped[List["StockMovement"]] = relationship("StockMovement", back_populates="order")
    production_batches: Mapped[List["ProductionBatch"]] = relationship("ProductionBatch", back_populates="order")
    fabric_rolls: Mapped[List["FabricRoll"]] = relationship("FabricRoll", back_populates="order")
    dispatches: Mapped[List["Dispatch"]] = relationship("Dispatch", back_populates="order")
    expenses: Mapped[List["Expense"]] = relationship("Expense", back_populates="order")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="order")
