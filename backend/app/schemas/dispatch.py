from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class AvailableFinishedGoodResponse(BaseModel):
    id: int
    roll_id: int
    roll_number: str
    order_id: int
    order_number: str
    fabric_type: str
    colour: str
    buyer_id: int
    buyer_name: str
    length_metres: float
    status: str
    entered_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DispatchCreate(BaseModel):
    order_id: int
    roll_ids: List[int] = Field(..., min_length=1)
    invoice_number: str

class DispatchStatusUpdate(BaseModel):
    status: str = Field(..., description="Target delivery status: ready_for_dispatch, dispatched, in_transit, delivered, delivery_failed")

class DispatchItemResponse(BaseModel):
    id: int
    roll_id: int
    roll_number: str
    metres: float

    model_config = ConfigDict(from_attributes=True)

class DispatchResponse(BaseModel):
    id: int
    dispatch_number: str
    order_id: int
    order_number: str
    buyer_id: int
    buyer_name: str
    invoice_number: str
    total_metres: float
    status: str
    status_label: Optional[str] = None
    dispatch_date: datetime
    delivered_at: Optional[datetime] = None
    delivered_by_user_id: Optional[int] = None
    delivered_by_name: Optional[str] = None
    created_at: datetime
    items: List[DispatchItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
