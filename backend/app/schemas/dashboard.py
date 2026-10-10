from typing import List, Dict, Any
from pydantic import BaseModel

class MachineStatusSummary(BaseModel):
    running: int
    idle: int
    maintenance: int
    error: int
    total: int

class QualityMetricsSummary(BaseModel):
    total_rolls: int
    total_inspected: int
    passed_count: int
    rework_count: int
    rejected_count: int
    pass_rate_pct: float
    defect_breakdown: Dict[str, int]

class FinancialMetricsSummary(BaseModel):
    total_revenue: float
    total_expenses: float
    total_wages: float
    total_cost: float
    gross_profit: float
    gross_margin_pct: float
    total_collected: float
    total_receivables_due: float

class ProductionTrendItem(BaseModel):
    stage: str
    metres: float
    batches: int

class BuyerRevenueItem(BaseModel):
    buyer_name: str
    total_revenue: float
    total_metres: float

class DashboardStatsResponse(BaseModel):
    total_orders: int
    active_orders: int
    total_produced_metres: float
    total_dispatched_metres: float
    low_stock_alerts_count: int
    machine_fleet: MachineStatusSummary
    quality: QualityMetricsSummary
    finance: FinancialMetricsSummary
    production_by_stage: List[ProductionTrendItem]
    top_buyers: List[BuyerRevenueItem]
