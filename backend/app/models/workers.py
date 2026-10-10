import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Integer, String, Float, Boolean, DateTime, Enum as SQLEnum, ForeignKey, CheckConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    leave = "leave"

class Worker(Base):
    __tablename__ = "workers"
    __table_args__ = (
        CheckConstraint("hourly_wage >= 0", name="chk_worker_wage"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    employee_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    hourly_wage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    attendance_records: Mapped[List["AttendanceRecord"]] = relationship("AttendanceRecord", back_populates="worker")
    wage_records: Mapped[List["WageRecord"]] = relationship("WageRecord", back_populates="worker")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (
        CheckConstraint("hours_worked >= 0", name="chk_attendance_hours"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    worker_id: Mapped[int] = mapped_column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    shift: Mapped[str] = mapped_column(String(20), nullable=False, default="morning")
    hours_worked: Mapped[float] = mapped_column(Float, nullable=False, default=8.0)
    status: Mapped[AttendanceStatus] = mapped_column(
        SQLEnum(AttendanceStatus, name="attendance_status_enum", native_enum=False),
        nullable=False,
        default=AttendanceStatus.present
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    worker: Mapped["Worker"] = relationship("Worker", back_populates="attendance_records")

class WageRecord(Base):
    __tablename__ = "wage_records"
    __table_args__ = (
        CheckConstraint("total_wage >= 0", name="chk_wage_total"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    worker_id: Mapped[int] = mapped_column(Integer, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    regular_wages: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    overtime_wages: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_wage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    worker: Mapped["Worker"] = relationship("Worker", back_populates="wage_records")
