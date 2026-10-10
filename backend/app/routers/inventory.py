from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.inventory import RawMaterial, Supplier, StockMovement, StockMovementType
from app.schemas.inventory import (
    RawMaterialCreate, RawMaterialResponse,
    SupplierCreate, SupplierResponse,
    StockMovementCreate, StockMovementResponse,
    InventoryAlertResponse
)
from app.core.deps import require_roles

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/materials", response_model=List[RawMaterialResponse])
def list_raw_materials(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """List all raw materials with computed low-stock indicators."""
    materials = db.query(RawMaterial).order_by(RawMaterial.yarn_type.asc()).all()
    results = []
    for m in materials:
        is_low = m.quantity_on_hand <= m.reorder_threshold
        resp = RawMaterialResponse.model_validate(m)
        resp.is_low_stock = is_low
        results.append(resp)
    return results

@router.post("/materials", response_model=RawMaterialResponse, status_code=status.HTTP_201_CREATED)
def create_raw_material(
    material_in: RawMaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """Register a new yarn raw material specification."""
    material = RawMaterial(
        yarn_type=material_in.yarn_type.strip(),
        colour=material_in.colour.strip(),
        quantity_on_hand=material_in.quantity_on_hand,
        unit=material_in.unit.strip(),
        reorder_threshold=material_in.reorder_threshold
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    resp = RawMaterialResponse.model_validate(material)
    resp.is_low_stock = material.quantity_on_hand <= material.reorder_threshold
    return resp

@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """List all raw material yarn suppliers."""
    return db.query(Supplier).order_by(Supplier.name.asc()).all()

@router.post("/suppliers", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """Register a yarn vendor/supplier."""
    supplier = Supplier(
        name=supplier_in.name.strip(),
        contact_person=supplier_in.contact_person.strip() if supplier_in.contact_person else None,
        phone=supplier_in.phone.strip() if supplier_in.phone else None,
        email=supplier_in.email.strip().lower() if supplier_in.email else None,
        address=supplier_in.address.strip() if supplier_in.address else None
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)

@router.get("/movements", response_model=List[StockMovementResponse])
def list_stock_movements(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """Retrieve audit history of stock receipts and consumption movements."""
    movements = (
        db.query(StockMovement)
        .order_by(StockMovement.timestamp.desc())
        .limit(limit)
        .all()
    )
    results = []
    for mov in movements:
        item = StockMovementResponse.model_validate(mov)
        if mov.material:
            item.material_yarn_type = mov.material.yarn_type
            item.material_colour = mov.material.colour
        if mov.supplier:
            item.supplier_name = mov.supplier.name
        results.append(item)
    return results

@router.post("/movements", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def record_stock_movement(
    movement_in: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """
    Atomic transaction: Record stock movement and adjust inventory balance.
    Enforces business rule: Stock can never drop below zero.
    """
    material = db.query(RawMaterial).filter(RawMaterial.id == movement_in.material_id).with_for_update().first()
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Raw material with ID {movement_in.material_id} not found."
        )

    if movement_in.movement_type == StockMovementType.consumed:
        if material.quantity_on_hand < movement_in.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock on hand for {material.yarn_type} ({material.colour}). "
                    f"Available: {material.quantity_on_hand} {material.unit}, Requested: {movement_in.quantity} {material.unit}."
                )
            )
        material.quantity_on_hand -= movement_in.quantity
    elif movement_in.movement_type == StockMovementType.received:
        material.quantity_on_hand += movement_in.quantity
    elif movement_in.movement_type == StockMovementType.adjustment:
        material.quantity_on_hand = movement_in.quantity

    movement = StockMovement(
        material_id=material.id,
        movement_type=movement_in.movement_type,
        quantity=movement_in.quantity,
        supplier_id=movement_in.supplier_id,
        reference_order_id=movement_in.reference_order_id,
        notes=movement_in.notes
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    resp = StockMovementResponse.model_validate(movement)
    resp.material_yarn_type = material.yarn_type
    resp.material_colour = material.colour
    if movement.supplier:
        resp.supplier_name = movement.supplier.name
    return resp

@router.get("/alerts", response_model=List[InventoryAlertResponse])
def get_low_stock_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """Return all raw materials that have fallen at or below their reorder threshold."""
    materials = db.query(RawMaterial).filter(RawMaterial.quantity_on_hand <= RawMaterial.reorder_threshold).all()
    alerts = []
    for m in materials:
        shortfall = max(0.0, m.reorder_threshold - m.quantity_on_hand)
        status_label = "CRITICAL EMPTY" if m.quantity_on_hand == 0 else "LOW STOCK"
        alerts.append(InventoryAlertResponse(
            material_id=m.id,
            yarn_type=m.yarn_type,
            colour=m.colour,
            quantity_on_hand=m.quantity_on_hand,
            reorder_threshold=m.reorder_threshold,
            unit=m.unit,
            shortfall=shortfall,
            status=status_label
        ))
    return alerts
