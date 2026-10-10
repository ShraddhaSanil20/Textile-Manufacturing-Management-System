from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.models.orders import CustomerOrder, OrderStatus, Buyer
from app.models.inventory import RawMaterial
from app.models.production import Machine, MachineStatus, FabricRoll, ProductionBatch, ProductionStage
from app.models.quality import QualityInspection, InspectionResult, DefectCategory
from app.models.dispatch import Dispatch
from app.models.workers import WageRecord
from app.models.finance import Expense, Payment, PaymentStatus
from app.schemas.dashboard import (
    DashboardStatsResponse,
    MachineStatusSummary,
    QualityMetricsSummary,
    FinancialMetricsSummary,
    ProductionTrendItem,
    BuyerRevenueItem
)

router = APIRouter(prefix="/dashboard", tags=["Executive Dashboard"])

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_telemetry(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts", "store_manager", "production_operator"))
):
    """
    Consolidated executive operations telemetry:
    - Production output volume and fleet health
    - Four-point defect breakdown and pass rates
    - Full factory financial health (revenue, raw materials, wages, profit margins)
    - Low inventory alerts and buyer volume distribution
    """
    # 1. Orders
    all_orders = db.query(CustomerOrder).all()
    total_orders = len(all_orders)
    active_orders = len([o for o in all_orders if o.status not in [OrderStatus.completed, OrderStatus.dispatched]])

    # 2. Production & Dispatch volumes
    total_produced_metres = float(db.query(func.coalesce(func.sum(FabricRoll.length_metres), 0.0)).scalar())
    total_dispatched_metres = float(db.query(func.coalesce(func.sum(Dispatch.total_metres), 0.0)).scalar())

    # 3. Inventory low-stock count
    low_stock_count = (
        db.query(RawMaterial)
        .filter(RawMaterial.quantity_on_hand <= RawMaterial.reorder_threshold)
        .count()
    )

    # 4. Machine fleet status
    machines = db.query(Machine).all()
    running_mac = sum(1 for m in machines if m.status == MachineStatus.running)
    idle_mac = sum(1 for m in machines if m.status == MachineStatus.idle)
    maint_mac = sum(1 for m in machines if m.status == MachineStatus.maintenance)
    error_mac = sum(1 for m in machines if m.status == MachineStatus.error)

    machine_summary = MachineStatusSummary(
        running=running_mac,
        idle=idle_mac,
        maintenance=maint_mac,
        error=error_mac,
        total=len(machines)
    )

    # 5. Quality metrics
    total_rolls = db.query(FabricRoll).count()
    inspections = db.query(QualityInspection).all()
    passed_count = sum(1 for i in inspections if i.result == InspectionResult.passed)
    rework_count = sum(1 for i in inspections if i.result == InspectionResult.rework)
    rejected_count = sum(1 for i in inspections if i.result == InspectionResult.rejected)
    total_inspected = len(inspections)
    pass_rate = round((passed_count / total_inspected * 100.0), 1) if total_inspected > 0 else 0.0

    defect_breakdown = {
        "stain": sum(1 for i in inspections if i.defect_category == DefectCategory.stain),
        "tear": sum(1 for i in inspections if i.defect_category == DefectCategory.tear),
        "weave_flaw": sum(1 for i in inspections if i.defect_category == DefectCategory.weave_flaw),
        "colour_variation": sum(1 for i in inspections if i.defect_category == DefectCategory.colour_variation),
        "other": sum(1 for i in inspections if i.defect_category == DefectCategory.other),
    }

    quality_summary = QualityMetricsSummary(
        total_rolls=total_rolls,
        total_inspected=total_inspected,
        passed_count=passed_count,
        rework_count=rework_count,
        rejected_count=rejected_count,
        pass_rate_pct=pass_rate,
        defect_breakdown=defect_breakdown
    )

    # 6. Financial KPIs
    total_revenue = sum(o.total_revenue for o in all_orders)
    direct_expenses = float(db.query(func.coalesce(func.sum(Expense.amount), 0.0)).scalar())
    total_wages = float(db.query(func.coalesce(func.sum(WageRecord.total_wage), 0.0)).scalar())

    # Raw material estimated cost (0.25 kg yarn/m @ $3.50/kg across all ordered metres)
    total_ordered_metres = sum(o.quantity_metres for o in all_orders)
    est_material_cost = round(total_ordered_metres * 0.25 * 3.50, 2)

    total_cost = round(est_material_cost + direct_expenses + total_wages, 2)
    gross_profit = round(total_revenue - total_cost, 2)
    gross_margin_pct = round((gross_profit / total_revenue * 100.0), 1) if total_revenue > 0 else 0.0

    total_collected = float(
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.status == PaymentStatus.received)
        .scalar()
    )
    receivables_due = max(0.0, round(total_revenue - total_collected, 2))

    finance_summary = FinancialMetricsSummary(
        total_revenue=total_revenue,
        total_expenses=round(direct_expenses, 2),
        total_wages=round(total_wages, 2),
        total_cost=total_cost,
        gross_profit=gross_profit,
        gross_margin_pct=gross_margin_pct,
        total_collected=round(total_collected, 2),
        total_receivables_due=receivables_due
    )

    # 7. Production volume by stage
    batches = db.query(ProductionBatch).all()
    stage_totals = {"spinning": 0.0, "weaving": 0.0, "dyeing": 0.0}
    stage_counts = {"spinning": 0, "weaving": 0, "dyeing": 0}

    for b in batches:
        stg = b.stage.value if hasattr(b.stage, "value") else str(b.stage)
        if stg in stage_totals:
            stage_totals[stg] += b.output_metres
            stage_counts[stg] += 1

    production_by_stage = [
        ProductionTrendItem(
            stage=s.capitalize(),
            metres=round(stage_totals[s], 1),
            batches=stage_counts[s]
        )
        for s in ["spinning", "weaving", "dyeing"]
    ]

    # 8. Top buyers by revenue
    buyers_query = db.query(Buyer).all()
    top_buyers = []
    for b in buyers_query:
        b_rev = sum(o.total_revenue for o in b.orders)
        b_met = sum(o.quantity_metres for o in b.orders)
        if b_rev > 0 or b_met > 0:
            top_buyers.append(BuyerRevenueItem(
                buyer_name=b.company_name,
                total_revenue=round(b_rev, 2),
                total_metres=round(b_met, 2)
            ))
    top_buyers.sort(key=lambda x: x.total_revenue, reverse=True)

    return DashboardStatsResponse(
        total_orders=total_orders,
        active_orders=active_orders,
        total_produced_metres=round(total_produced_metres, 2),
        total_dispatched_metres=round(total_dispatched_metres, 2),
        low_stock_alerts_count=low_stock_count,
        machine_fleet=machine_summary,
        quality=quality_summary,
        finance=finance_summary,
        production_by_stage=production_by_stage,
        top_buyers=top_buyers[:5]
    )
