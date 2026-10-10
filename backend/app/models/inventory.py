import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Integer, String, Float, DateTime, Enum as SQLEnum, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class StockMovementType(str, enum.Enum):
    received = "received"
    consumed = "consumed"
    adjustment = "adjustment"

class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    stock_movements: Mapped[List["StockMovement"]] = relationship("StockMovement", back_populates="supplier")

class RawMaterial(Base):
    __tablename__ = "raw_materials"
    __table_args__ = (
        CheckConstraint("quantity_on_hand >= 0", name="chk_raw_material_quantity"),
        CheckConstraint("reorder_threshold >= 0", name="chk_raw_material_reorder"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    yarn_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    colour: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    quantity_on_hand: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="kg")
    reorder_threshold: Mapped[float] = mapped_column(Float, nullable=False, default=100.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    stock_movements: Mapped[List["StockMovement"]] = relationship("StockMovement", back_populates="material")

class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_stock_movement_quantity"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    material_id: Mapped[int] = mapped_column(Integer, ForeignKey("raw_materials.id", ondelete="CASCADE"), nullable=False, index=True)
    movement_type: Mapped[StockMovementType] = mapped_column(
        SQLEnum(StockMovementType, name="stock_movement_type_enum", native_enum=False),
        nullable=False
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    reference_order_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("customer_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    supplier_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    material: Mapped["RawMaterial"] = relationship("RawMaterial", back_populates="stock_movements")
    supplier: Mapped[Optional["Supplier"]] = relationship("Supplier", back_populates="stock_movements")
    order: Mapped[Optional["CustomerOrder"]] = relationship("CustomerOrder", back_populates="stock_movements")
