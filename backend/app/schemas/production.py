from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.production import MachineType, MachineStatus, ProductionStage, ShiftType, BatchStatus

class MachineBase(BaseModel):
    name: str
    type: MachineType
    status: MachineStatus = MachineStatus.idle

class MachineCreate(MachineBase):
    pass

class MachineStatusUpdate(BaseModel):
    status: MachineStatus

class MachineResponse(MachineBase):
    id: int
    created_at: datetime
    active_batch_number: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ProductionBatchCreate(BaseModel):
    order_id: int
    stage: ProductionStage
    machine_id: int
    shift: ShiftType = ShiftType.morning
    output_metres: float = Field(default=0.0, ge=0)
    downtime_minutes: int = Field(default=0, ge=0)

class BatchOutputRecord(BaseModel):
    output_metres: float = Field(gt=0, description="Additional metres output")
    downtime_minutes: int = Field(default=0, ge=0)
    create_fabric_rolls: bool = True
    mark_completed: bool = False

class ProductionBatchResponse(BaseModel):
    id: int
    batch_number: str
    order_id: int
    order_number: Optional[str] = None
    stage: ProductionStage
    machine_id: int
    machine_name: Optional[str] = None
    shift: ShiftType
    output_metres: float
    downtime_minutes: int
    status: BatchStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    created_at: datetime
    fabric_rolls_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class DelayedOrderResponse(BaseModel):
    order_id: int
    order_number: str
    fabric_type: str
    colour: str
    ordered_metres: float
    produced_metres: float
    due_date: datetime
    days_remaining: int
    is_delayed: bool
