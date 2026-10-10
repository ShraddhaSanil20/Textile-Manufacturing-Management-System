from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.production import FabricRoll, ProductionBatch, Machine
from app.models.orders import CustomerOrder, OrderStatus
from app.models.quality import QualityInspection, InspectionResult, DefectCategory
from app.models.dispatch import FinishedGood, FinishedGoodStatus
from app.schemas.quality import (
    InspectionCreate,
    InspectionResponse,
    RollGenealogyResponse,
    QualityStatsResponse
)

router = APIRouter(prefix="/quality", tags=["Quality Control"])

@router.get("/rolls", response_model=List[RollGenealogyResponse])
def list_rolls_for_inspection(
    status_filter: Optional[str] = Query(None, alias="status"),
    order_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "quality_inspector", "store_manager", "production_operator"))
):
    """
    List fabric rolls with complete production genealogy:
    roll number, length, originating machine, batch, customer order, and current inspection state.
    """
    query = db.query(FabricRoll).order_by(FabricRoll.id.desc())
    if order_id:
        query = query.filter(FabricRoll.order_id == order_id)

    rolls = query.all()
    results = []

    for r in rolls:
        insp = r.inspection
        insp_status = insp.result.value if (insp and hasattr(insp.result, "value")) else ("awaiting" if not insp else str(insp.result))
        defect = insp.defect_category.value if (insp and hasattr(insp.defect_category, "value")) else ("none" if not insp else str(insp.defect_category))
        notes = insp.notes if insp else None
        inspector_name = insp.inspector.full_name if (insp and insp.inspector) else None
        fg_status = r.finished_good.status.value if (r.finished_good and hasattr(r.finished_good.status, "value")) else (str(r.finished_good.status) if r.finished_good else None)

        if status_filter:
            if status_filter == "pending" and insp_status != "awaiting":
                continue
            elif status_filter != "pending" and insp_status != status_filter:
                continue

        results.append(RollGenealogyResponse(
            id=r.id,
            roll_number=r.roll_number,
            length_metres=r.length_metres,
            order_id=r.order_id,
            order_number=r.order.order_number if r.order else "N/A",
            fabric_type=r.order.fabric_type if r.order else "Unknown",
            colour=r.order.colour if r.order else "Unknown",
            batch_id=r.batch_id,
            batch_number=r.batch.batch_number if r.batch else "N/A",
            machine_id=r.machine_id,
            machine_name=r.machine.name if r.machine else "N/A",
            created_at=r.created_at,
            inspection_status=insp_status,
            defect_category=defect,
            notes=notes,
            inspector_name=inspector_name,
            finished_good_status=fg_status
        ))

    return results

@router.get("/rolls/{roll_id}", response_model=RollGenealogyResponse)
def get_roll_details(
    roll_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "quality_inspector", "store_manager", "production_operator"))
):
    """Retrieve detailed roll genealogy and quality record."""
    r = db.query(FabricRoll).filter(FabricRoll.id == roll_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Fabric roll not found")

    insp = r.inspection
    insp_status = insp.result.value if (insp and hasattr(insp.result, "value")) else ("awaiting" if not insp else str(insp.result))
    defect = insp.defect_category.value if (insp and hasattr(insp.defect_category, "value")) else ("none" if not insp else str(insp.defect_category))
    notes = insp.notes if insp else None
    inspector_name = insp.inspector.full_name if (insp and insp.inspector) else None
    fg_status = r.finished_good.status.value if (r.finished_good and hasattr(r.finished_good.status, "value")) else (str(r.finished_good.status) if r.finished_good else None)

    return RollGenealogyResponse(
        id=r.id,
        roll_number=r.roll_number,
        length_metres=r.length_metres,
        order_id=r.order_id,
        order_number=r.order.order_number if r.order else "N/A",
        fabric_type=r.order.fabric_type if r.order else "Unknown",
        colour=r.order.colour if r.order else "Unknown",
        batch_id=r.batch_id,
        batch_number=r.batch.batch_number if r.batch else "N/A",
        machine_id=r.machine_id,
        machine_name=r.machine.name if r.machine else "N/A",
        created_at=r.created_at,
        inspection_status=insp_status,
        defect_category=defect,
        notes=notes,
        inspector_name=inspector_name,
        finished_good_status=fg_status
    )

@router.post("/inspections", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
def record_quality_inspection(
    payload: InspectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "quality_inspector"))
):
    """
    Record or update quality inspection on a fabric roll.
    - If passed: automatically enrolls roll into finished_goods inventory as 'available'.
    - If rework or rejected: marks accordingly and ensures roll is NOT in available finished goods.
    """
    roll = db.query(FabricRoll).filter(FabricRoll.id == payload.roll_id).first()
    if not roll:
        raise HTTPException(status_code=404, detail="Fabric roll not found")

    # If roll already inspected, update; otherwise create
    inspection = db.query(QualityInspection).filter(QualityInspection.roll_id == payload.roll_id).first()
    if inspection:
        inspection.inspector_id = current_user.id
        inspection.result = payload.result
        inspection.defect_category = payload.defect_category
        inspection.notes = payload.notes
    else:
        inspection = QualityInspection(
            roll_id=payload.roll_id,
            inspector_id=current_user.id,
            result=payload.result,
            defect_category=payload.defect_category,
            notes=payload.notes
        )
        db.add(inspection)

    db.flush()

    # Finished Goods synchronization
    fg = db.query(FinishedGood).filter(FinishedGood.roll_id == payload.roll_id).first()
    if payload.result == InspectionResult.passed:
        if not fg:
            fg = FinishedGood(roll_id=payload.roll_id, status=FinishedGoodStatus.available)
            db.add(fg)
        elif fg.status != FinishedGoodStatus.dispatched:
            fg.status = FinishedGoodStatus.available

        # Check order progress: if order is currently in 'in_production' or 'created', progress to quality_check or ready_to_ship
        order = roll.order
        if order:
            # Calculate total passed metres for this order
            passed_metres = (
                db.query(func.coalesce(func.sum(FabricRoll.length_metres), 0.0))
                .join(QualityInspection, QualityInspection.roll_id == FabricRoll.id)
                .filter(FabricRoll.order_id == order.id, QualityInspection.result == InspectionResult.passed)
                .scalar()
            )
            if passed_metres >= order.quantity_metres and order.status in [OrderStatus.in_production, OrderStatus.quality_check]:
                order.status = OrderStatus.ready_to_ship
            elif order.status == OrderStatus.in_production:
                order.status = OrderStatus.quality_check
    else:
        # If rework or rejected, make sure not available for dispatch
        if fg and fg.status == FinishedGoodStatus.available:
            db.delete(fg)

    db.commit()
    db.refresh(inspection)

    return InspectionResponse(
        id=inspection.id,
        roll_id=inspection.roll_id,
        roll_number=roll.roll_number,
        inspector_id=inspection.inspector_id,
        inspector_name=current_user.full_name,
        result=inspection.result.value if hasattr(inspection.result, "value") else str(inspection.result),
        defect_category=inspection.defect_category.value if hasattr(inspection.defect_category, "value") else str(inspection.defect_category),
        notes=inspection.notes,
        inspection_time=inspection.inspection_time
    )

@router.get("/inspections", response_model=List[InspectionResponse])
def list_inspections(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "quality_inspector", "store_manager"))
):
    """List recent inspection logs."""
    inspections = (
        db.query(QualityInspection)
        .order_by(QualityInspection.inspection_time.desc())
        .limit(limit)
        .all()
    )

    return [
        InspectionResponse(
            id=insp.id,
            roll_id=insp.roll_id,
            roll_number=insp.roll.roll_number if insp.roll else f"Roll #{insp.roll_id}",
            inspector_id=insp.inspector_id,
            inspector_name=insp.inspector.full_name if insp.inspector else "Unknown",
            result=insp.result.value if hasattr(insp.result, "value") else str(insp.result),
            defect_category=insp.defect_category.value if hasattr(insp.defect_category, "value") else str(insp.defect_category),
            notes=insp.notes,
            inspection_time=insp.inspection_time
        )
        for insp in inspections
    ]

@router.get("/stats", response_model=QualityStatsResponse)
def get_quality_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "quality_inspector", "store_manager", "accounts"))
):
    """Summary statistics on quality inspections and defect distribution."""
    total_rolls = db.query(FabricRoll).count()

    inspections = db.query(QualityInspection).all()
    inspected_roll_ids = {insp.roll_id for insp in inspections}

    pending_count = total_rolls - len(inspected_roll_ids)
    passed_count = sum(1 for i in inspections if i.result == InspectionResult.passed)
    rework_count = sum(1 for i in inspections if i.result == InspectionResult.rework)
    rejected_count = sum(1 for i in inspections if i.result == InspectionResult.rejected)

    total_inspected = len(inspections)
    pass_rate_pct = round((passed_count / total_inspected * 100.0), 1) if total_inspected > 0 else 0.0

    defect_breakdown = {
        "stain": sum(1 for i in inspections if i.defect_category == DefectCategory.stain),
        "tear": sum(1 for i in inspections if i.defect_category == DefectCategory.tear),
        "weave_flaw": sum(1 for i in inspections if i.defect_category == DefectCategory.weave_flaw),
        "colour_variation": sum(1 for i in inspections if i.defect_category == DefectCategory.colour_variation),
        "other": sum(1 for i in inspections if i.defect_category == DefectCategory.other),
    }

    return QualityStatsResponse(
        total_rolls=total_rolls,
        pending_count=max(0, pending_count),
        passed_count=passed_count,
        rework_count=rework_count,
        rejected_count=rejected_count,
        pass_rate_pct=pass_rate_pct,
        defect_breakdown=defect_breakdown
    )
