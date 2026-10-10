from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.orders import CustomerOrder, Buyer, OrderStatus
from app.models.inventory import RawMaterial
from app.schemas.orders import (
    OrderCreate, OrderResponse, OrderStatusUpdate, MaterialCheckResult, BuyerSummary
)
from app.core.deps import get_current_user, require_roles

router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("/meta/buyers", response_model=List[BuyerSummary])
def list_buyers_metadata(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """Retrieve all buyer accounts for order creation."""
    buyers = db.query(Buyer).order_by(Buyer.company_name.asc()).all()
    results = []
    for b in buyers:
        results.append(BuyerSummary(
            id=b.id,
            company_name=b.company_name,
            contact_person=b.user.full_name if b.user else None,
            phone=b.phone,
            email=b.user.email if b.user else None
        ))
    return results

@router.get("", response_model=List[OrderResponse])
def list_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List orders.
    Enforces RBAC:
    - If user is 'buyer', strictly filters to orders belonging to their buyer profile.
    - If user is 'admin' or 'store_manager', returns all customer orders.
    """
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role not in ["admin", "store_manager", "buyer", "accounts", "production_operator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view customer orders."
        )

    query = db.query(CustomerOrder)
    if role == "buyer":
        buyer = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
        if not buyer:
            return []
        query = query.filter(CustomerOrder.buyer_id == buyer.id)

    orders = query.order_by(CustomerOrder.created_at.desc()).all()
    results = []
    for o in orders:
        resp = OrderResponse.model_validate(o)
        if o.buyer:
            resp.buyer_name = o.buyer.company_name
        # Compute roll metrics
        resp.passed_rolls_count = len([r for r in o.fabric_rolls if r.inspection and r.inspection.result.value == "passed"])
        resp.produced_metres = sum(r.length_metres for r in o.fabric_rolls)
        resp.dispatched_metres = sum(r.length_metres for r in o.fabric_rolls if r.dispatch_item is not None)
        results.append(resp)
    return results

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new fabric order.
    Buyers can self-create orders; store_managers and admins can create for any buyer.
    """
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role not in ["admin", "store_manager", "buyer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to create orders."
        )

    if role == "buyer":
        buyer = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
        if not buyer:
            # Auto-provision buyer record if missing
            buyer = Buyer(
                user_id=current_user.id,
                company_name=current_user.full_name,
                phone=None,
                address=None
            )
            db.add(buyer)
            db.flush()
        buyer_id = buyer.id
    else:
        if not order_in.buyer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="buyer_id is required when creating an order as staff."
            )
        buyer = db.query(Buyer).filter(Buyer.id == order_in.buyer_id).first()
        if not buyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Buyer with ID {order_in.buyer_id} not found."
            )
        buyer_id = buyer.id

    # Generate sequential unique order number
    count = db.query(CustomerOrder).count()
    order_number = f"ORD-{datetime.now().year}-{count + 1:04d}"

    total_revenue = round(order_in.quantity_metres * order_in.unit_price, 2)

    order = CustomerOrder(
        order_number=order_number,
        buyer_id=buyer_id,
        fabric_type=order_in.fabric_type.strip(),
        colour=order_in.colour.strip(),
        quantity_metres=order_in.quantity_metres,
        due_date=order_in.due_date,
        status=OrderStatus.created,
        unit_price=order_in.unit_price,
        total_revenue=total_revenue
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    resp = OrderResponse.model_validate(order)
    if order.buyer:
        resp.buyer_name = order.buyer.company_name
    return resp

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve full details of a customer order."""
    order = db.query(CustomerOrder).filter(CustomerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role == "buyer":
        buyer = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
        if not buyer or order.buyer_id != buyer.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")

    resp = OrderResponse.model_validate(order)
    if order.buyer:
        resp.buyer_name = order.buyer.company_name
    resp.passed_rolls_count = len([r for r in order.fabric_rolls if r.inspection and r.inspection.result.value == "passed"])
    resp.produced_metres = sum(r.length_metres for r in order.fabric_rolls)
    resp.dispatched_metres = sum(r.length_metres for r in order.fabric_rolls if r.dispatch_item is not None)
    return resp

@router.post("/{order_id}/material-check", response_model=MaterialCheckResult)
def check_material_availability(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """
    Automated Material Availability Check:
    Verifies if Everest Textile Mills has sufficient yarn in stock to fulfill the order.
    Calculates yarn requirement (approx 0.25 kg yarn per metre of fabric).
    """
    order = db.query(CustomerOrder).filter(CustomerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Conversion factor: standard 0.25 kg yarn per metre of fabric
    required_yarn_kg = round(order.quantity_metres * 0.25, 2)

    # Search for matching raw material by colour or matching fabric words
    matching_materials = (
        db.query(RawMaterial)
        .filter(RawMaterial.colour.ilike(f"%{order.colour}%"))
        .all()
    )

    available_yarn_kg = 0.0
    matched_id = None
    if matching_materials:
        matched_id = matching_materials[0].id
        available_yarn_kg = sum(m.quantity_on_hand for m in matching_materials)
    else:
        # Check any available stock if generic
        all_materials = db.query(RawMaterial).all()
        if all_materials:
            matched_id = all_materials[0].id
            available_yarn_kg = sum(m.quantity_on_hand for m in all_materials)

    sufficient = available_yarn_kg >= required_yarn_kg
    shortage_kg = max(0.0, round(required_yarn_kg - available_yarn_kg, 2))

    if sufficient and order.status == OrderStatus.created:
        order.status = OrderStatus.material_check
        db.commit()
        db.refresh(order)
        message = f"Material availability confirmed! Available: {available_yarn_kg} kg vs Required: {required_yarn_kg} kg. Order moved to 'material_check'."
    elif sufficient:
        message = f"Sufficient yarn available ({available_yarn_kg} kg on hand for {required_yarn_kg} kg required)."
    else:
        message = f"WARNING: Insufficient yarn! Shortage of {shortage_kg} kg. Please order additional {order.colour} yarn from suppliers before starting spinning."

    return MaterialCheckResult(
        order_id=order.id,
        order_number=order.order_number,
        fabric_type=order.fabric_type,
        colour=order.colour,
        ordered_metres=order.quantity_metres,
        required_yarn_kg=required_yarn_kg,
        available_yarn_kg=available_yarn_kg,
        shortage_kg=shortage_kg,
        sufficient=sufficient,
        status_updated=order.status.value,
        matched_material_id=matched_id,
        message=message
    )

@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """Update order lifecycle status."""
    order = db.query(CustomerOrder).filter(CustomerOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status_update.status
    db.commit()
    db.refresh(order)

    resp = OrderResponse.model_validate(order)
    if order.buyer:
        resp.buyer_name = order.buyer.company_name
    return resp
