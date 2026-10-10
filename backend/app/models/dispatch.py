import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Integer, String, Float, DateTime, Enum as SQLEnum, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class FinishedGoodStatus(str, enum.Enum):
    available = "available"
    reserved = "reserved"
    dispatched = "dispatched"

class FinishedGood(Base):
    __tablename__ = "finished_goods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    roll_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fabric_rolls.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False
    )
    status: Mapped[FinishedGoodStatus] = mapped_column(
        SQLEnum(FinishedGoodStatus, name="finished_good_status_enum", native_enum=False),
        nullable=False,
        default=FinishedGoodStatus.available,
        index=True
    )
    entered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    roll: Mapped["FabricRoll"] = relationship("FabricRoll", back_populates="finished_good")

class DeliveryStatus(str, enum.Enum):
    ready_for_dispatch = "ready_for_dispatch"
    dispatched = "dispatched"
    in_transit = "in_transit"
    delivered = "delivered"
    delivery_failed = "delivery_failed"

class Dispatch(Base):
    __tablename__ = "dispatches"
    __table_args__ = (
        CheckConstraint("total_metres > 0", name="chk_dispatch_total"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    dispatch_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("customer_orders.id", ondelete="RESTRICT"), nullable=False, index=True)
    buyer_id: Mapped[int] = mapped_column(Integer, ForeignKey("buyers.id", ondelete="RESTRICT"), nullable=False, index=True)
    dispatch_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    total_metres: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="dispatched", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Relationships
    order: Mapped["CustomerOrder"] = relationship("CustomerOrder", back_populates="dispatches")
    buyer: Mapped["Buyer"] = relationship("Buyer", back_populates="dispatches")
    delivered_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[delivered_by_user_id])
    items: Mapped[List["DispatchItem"]] = relationship("DispatchItem", back_populates="dispatch", cascade="all, delete-orphan")

class DispatchItem(Base):
    __tablename__ = "dispatch_items"
    __table_args__ = (
        CheckConstraint("metres > 0", name="chk_dispatch_item_metres"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    dispatch_id: Mapped[int] = mapped_column(Integer, ForeignKey("dispatches.id", ondelete="CASCADE"), nullable=False, index=True)
    roll_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fabric_rolls.id", ondelete="RESTRICT"),
        unique=True,  # Crucial: Prevents duplicate roll dispatch
        nullable=False,
        index=True
    )
    metres: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationships
    dispatch: Mapped["Dispatch"] = relationship("Dispatch", back_populates="items")
    roll: Mapped["FabricRoll"] = relationship("FabricRoll", back_populates="dispatch_item")
