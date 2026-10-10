from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.orders import OrderStatus

class BuyerSummary(BaseModel):
    id: int
    company_name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class OrderCreate(BaseModel):
    buyer_id: Optional[int] = None
    fabric_type: str
    colour: str
    quantity_metres: float = Field(gt=0, description="Order length in metres must be positive")
    due_date: datetime
    unit_price: float = Field(ge=0, default=0.0)

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderResponse(BaseModel):
    id: int
    order_number: str
    buyer_id: int
    buyer_name: Optional[str] = None
    fabric_type: str
    colour: str
    quantity_metres: float
    due_date: datetime
    status: OrderStatus
    unit_price: float
    total_revenue: float
    created_at: datetime

    # Summary tracking
    produced_metres: float = 0.0
    passed_rolls_count: int = 0
    dispatched_metres: float = 0.0

    model_config = ConfigDict(from_attributes=True)

class MaterialCheckResult(BaseModel):
    order_id: int
    order_number: str
    fabric_type: str
    colour: str
    ordered_metres: float
    required_yarn_kg: float
    available_yarn_kg: float
    shortage_kg: float
    sufficient: bool
    status_updated: str
    matched_material_id: Optional[int] = None
    message: str
