from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.finance import ExpenseCategory, PaymentMethod, PaymentStatus

class ExpenseCreate(BaseModel):
    category: ExpenseCategory
    amount: float = Field(..., gt=0.0)
    description: Optional[str] = None
    order_id: Optional[int] = None

class ExpenseResponse(BaseModel):
    id: int
    order_id: Optional[int] = None
    order_number: Optional[str] = None
    category: str
    amount: float
    description: Optional[str] = None
    expense_date: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaymentCreate(BaseModel):
    order_id: int
    buyer_id: Optional[int] = None
    amount: float = Field(..., gt=0.0)
    payment_method: PaymentMethod = PaymentMethod.bank_transfer
    status: PaymentStatus = PaymentStatus.received
    transaction_reference: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    order_id: int
    order_number: str
    buyer_id: int
    buyer_name: str
    amount: float
    payment_method: str
    status: str
    transaction_reference: Optional[str] = None
    payment_date: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OrderCostSummaryResponse(BaseModel):
    order_id: int
    order_number: str
    buyer_name: str
    fabric_type: str
    ordered_metres: float
    unit_price: float
    total_revenue: float
    material_cost: float
    expenses_cost: float
    total_cost: float
    gross_profit: float
    gross_margin_pct: float
    total_paid: float
    balance_due: float
    financial_status: str

    model_config = ConfigDict(from_attributes=True)
