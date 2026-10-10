import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Integer, String, Float, DateTime, Enum as SQLEnum, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class MachineType(str, enum.Enum):
    spinning = "spinning"
    weaving = "weaving"
    dyeing = "dyeing"

class MachineStatus(str, enum.Enum):
    idle = "idle"
    running = "running"
    maintenance = "maintenance"
    error = "error"

class ProductionStage(str, enum.Enum):
    spinning = "spinning"
    weaving = "weaving"
    dyeing = "dyeing"

class ShiftType(str, enum.Enum):
    morning = "morning"
    evening = "evening"
    night = "night"

class BatchStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"

class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    type: Mapped[MachineType] = mapped_column(
        SQLEnum(MachineType, name="machine_type_enum", native_enum=False),
        nullable=False,
        index=True
    )
    status: Mapped[MachineStatus] = mapped_column(
        SQLEnum(MachineStatus, name="machine_status_enum", native_enum=False),
        nullable=False,
        default=MachineStatus.idle,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    batches: Mapped[List["ProductionBatch"]] = relationship("ProductionBatch", back_populates="machine")
    fabric_rolls: Mapped[List["FabricRoll"]] = relationship("FabricRoll", back_populates="machine")

class ProductionBatch(Base):
    __tablename__ = "production_batches"
    __table_args__ = (
        CheckConstraint("output_metres >= 0", name="chk_batch_output"),
        CheckConstraint("downtime_minutes >= 0", name="chk_batch_downtime"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("customer_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    stage: Mapped[ProductionStage] = mapped_column(
        SQLEnum(ProductionStage, name="production_stage_enum", native_enum=False),
        nullable=False,
        index=True
    )
    machine_id: Mapped[int] = mapped_column(Integer, ForeignKey("machines.id", ondelete="RESTRICT"), nullable=False, index=True)
    shift: Mapped[ShiftType] = mapped_column(
        SQLEnum(ShiftType, name="shift_type_enum", native_enum=False),
        nullable=False
    )
    output_metres: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    downtime_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[BatchStatus] = mapped_column(
        SQLEnum(BatchStatus, name="batch_status_enum", native_enum=False),
        nullable=False,
        default=BatchStatus.in_progress,
        index=True
    )
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    order: Mapped["CustomerOrder"] = relationship("CustomerOrder", back_populates="production_batches")
    machine: Mapped["Machine"] = relationship("Machine", back_populates="batches")
    fabric_rolls: Mapped[List["FabricRoll"]] = relationship("FabricRoll", back_populates="batch")

class FabricRoll(Base):
    __tablename__ = "fabric_rolls"
    __table_args__ = (
        CheckConstraint("length_metres > 0", name="chk_roll_length"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    roll_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("customer_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id: Mapped[int] = mapped_column(Integer, ForeignKey("production_batches.id", ondelete="CASCADE"), nullable=False, index=True)
    machine_id: Mapped[int] = mapped_column(Integer, ForeignKey("machines.id", ondelete="RESTRICT"), nullable=False, index=True)
    length_metres: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    order: Mapped["CustomerOrder"] = relationship("CustomerOrder", back_populates="fabric_rolls")
    batch: Mapped["ProductionBatch"] = relationship("ProductionBatch", back_populates="fabric_rolls")
    machine: Mapped["Machine"] = relationship("Machine", back_populates="fabric_rolls")
    inspection: Mapped[Optional["QualityInspection"]] = relationship("QualityInspection", back_populates="roll", uselist=False)
    finished_good: Mapped[Optional["FinishedGood"]] = relationship("FinishedGood", back_populates="roll", uselist=False)
    dispatch_item: Mapped[Optional["DispatchItem"]] = relationship("DispatchItem", back_populates="roll", uselist=False)
