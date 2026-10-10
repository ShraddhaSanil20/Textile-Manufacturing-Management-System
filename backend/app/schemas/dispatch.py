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
    dispatch_date: datetime
    created_at: datetime
    items: List[DispatchItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
