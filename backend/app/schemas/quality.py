from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict
from app.models.quality import InspectionResult, DefectCategory

class InspectionCreate(BaseModel):
    roll_id: int
    result: InspectionResult
    defect_category: DefectCategory = DefectCategory.none
    notes: Optional[str] = None

class InspectionResponse(BaseModel):
    id: int
    roll_id: int
    roll_number: str
    inspector_id: int
    inspector_name: str
    result: str
    defect_category: str
    notes: Optional[str] = None
    inspection_time: datetime

    model_config = ConfigDict(from_attributes=True)

class RollGenealogyResponse(BaseModel):
    id: int
    roll_number: str
    length_metres: float
    order_id: int
    order_number: str
    fabric_type: str
    colour: str
    batch_id: int
    batch_number: str
    machine_id: int
    machine_name: str
    created_at: datetime
    inspection_status: str
    defect_category: str
    notes: Optional[str] = None
    inspector_name: Optional[str] = None
    finished_good_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class QualityStatsResponse(BaseModel):
    total_rolls: int
    pending_count: int
    passed_count: int
    rework_count: int
    rejected_count: int
    pass_rate_pct: float
    defect_breakdown: Dict[str, int]
