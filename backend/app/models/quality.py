import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, DateTime, Enum as SQLEnum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class InspectionResult(str, enum.Enum):
    passed = "passed"
    rework = "rework"
    rejected = "rejected"
    awaiting = "awaiting"

class DefectCategory(str, enum.Enum):
    none = "none"
    stain = "stain"
    tear = "tear"
    weave_flaw = "weave_flaw"
    colour_variation = "colour_variation"
    other = "other"

class QualityInspection(Base):
    __tablename__ = "quality_inspections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    roll_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("fabric_rolls.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False
    )
    inspector_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    result: Mapped[InspectionResult] = mapped_column(
        SQLEnum(InspectionResult, name="inspection_result_enum", native_enum=False),
        nullable=False,
        default=InspectionResult.awaiting,
        index=True
    )
    defect_category: Mapped[DefectCategory] = mapped_column(
        SQLEnum(DefectCategory, name="defect_category_enum", native_enum=False),
        nullable=False,
        default=DefectCategory.none
    )
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    inspection_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    roll: Mapped["FabricRoll"] = relationship("FabricRoll", back_populates="inspection")
    inspector: Mapped["User"] = relationship("User")
