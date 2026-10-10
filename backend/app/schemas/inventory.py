from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.models.inventory import StockMovementType

class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class RawMaterialBase(BaseModel):
    yarn_type: str
    colour: str
    quantity_on_hand: float = Field(default=0.0, ge=0)
    unit: str = "kg"
    reorder_threshold: float = Field(default=100.0, ge=0)

class RawMaterialCreate(RawMaterialBase):
    pass

class RawMaterialResponse(RawMaterialBase):
    id: int
    is_low_stock: bool = False
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StockMovementCreate(BaseModel):
    material_id: int
    movement_type: StockMovementType
    quantity: float = Field(gt=0, description="Movement quantity must be positive")
    supplier_id: Optional[int] = None
    reference_order_id: Optional[int] = None
    notes: Optional[str] = None

class StockMovementResponse(BaseModel):
    id: int
    material_id: int
    movement_type: StockMovementType
    quantity: float
    supplier_id: Optional[int] = None
    reference_order_id: Optional[int] = None
    notes: Optional[str] = None
    timestamp: datetime
    material_yarn_type: Optional[str] = None
    material_colour: Optional[str] = None
    supplier_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class InventoryAlertResponse(BaseModel):
    material_id: int
    yarn_type: str
    colour: str
    quantity_on_hand: float
    reorder_threshold: float
    unit: str
    shortfall: float
    status: str
