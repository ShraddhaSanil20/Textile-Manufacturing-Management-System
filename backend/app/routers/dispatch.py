from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.orders import CustomerOrder, OrderStatus, Buyer
from app.models.production import FabricRoll
from app.models.dispatch import FinishedGood, FinishedGoodStatus, Dispatch, DispatchItem, DeliveryStatus
from app.schemas.dispatch import (
    AvailableFinishedGoodResponse,
    DispatchCreate,
    DispatchResponse,
    DispatchItemResponse,
    DispatchStatusUpdate
)

DELIVERY_STATUS_MAP = {
    "ready_for_dispatch": "Ready for Dispatch",
    "dispatched": "Dispatched",
    "in_transit": "In Transit",
    "delivered": "Delivered",
    "delivery_failed": "Delivery Failed",
}

def normalize_delivery_status(raw: str) -> str:
    cleaned = raw.strip().lower().replace(" ", "_").replace("-", "_")
    if cleaned in DELIVERY_STATUS_MAP:
        return cleaned
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid delivery status '{raw}'. Valid options: {', '.join(DELIVERY_STATUS_MAP.values())}"
    )

def build_dispatch_response(d: Dispatch) -> DispatchResponse:
    delivered_by_name = d.delivered_by.full_name if d.delivered_by else None
    status_key = d.status.lower().replace(" ", "_") if d.status else "dispatched"
    status_label = DELIVERY_STATUS_MAP.get(status_key, d.status.replace("_", " ").title())
    
    items = [
        DispatchItemResponse(
            id=it.id,
            roll_id=it.roll_id,
            roll_number=it.roll.roll_number if it.roll else f"Roll #{it.roll_id}",
            metres=it.metres
        )
        for it in d.items
    ]

    buyer_name = "N/A"
    if d.buyer:
        buyer_name = d.buyer.company_name
    elif d.order and d.order.buyer:
        buyer_name = d.order.buyer.company_name

    order_number = d.order.order_number if d.order else "N/A"

    return DispatchResponse(
        id=d.id,
        dispatch_number=d.dispatch_number,
        order_id=d.order_id,
        order_number=order_number,
        buyer_id=d.buyer_id,
        buyer_name=buyer_name,
        invoice_number=d.invoice_number,
        total_metres=d.total_metres,
        status=d.status,
        status_label=status_label,
        dispatch_date=d.dispatch_date,
        delivered_at=d.delivered_at,
        delivered_by_user_id=d.delivered_by_user_id,
        delivered_by_name=delivered_by_name,
        created_at=d.created_at,
        items=items
    )

router = APIRouter(prefix="/dispatch", tags=["Finished Goods & Dispatch"])

@router.get("/finished-goods", response_model=List[AvailableFinishedGoodResponse])
def list_available_finished_goods(
    order_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager", "accounts"))
):
    """
    List rolls currently available in Finished Goods inventory.
    Only rolls that have passed quality inspection and are not yet dispatched are shown.
    """
    query = (
        db.query(FinishedGood)
        .join(FabricRoll, FabricRoll.id == FinishedGood.roll_id)
        .filter(FinishedGood.status == FinishedGoodStatus.available)
        .order_by(FinishedGood.entered_at.desc())
    )

    if order_id:
        query = query.filter(FabricRoll.order_id == order_id)

    fgs = query.all()
    results = []

    for fg in fgs:
        roll = fg.roll
        order = roll.order if roll else None
        buyer_name = order.buyer.company_name if (order and order.buyer) else "N/A"
        buyer_id = order.buyer_id if order else 0

        results.append(AvailableFinishedGoodResponse(
            id=fg.id,
            roll_id=roll.id,
            roll_number=roll.roll_number,
            order_id=order.id if order else 0,
            order_number=order.order_number if order else "N/A",
            fabric_type=order.fabric_type if order else "Unknown",
            colour=order.colour if order else "Unknown",
            buyer_id=buyer_id,
            buyer_name=buyer_name,
            length_metres=roll.length_metres,
            status=fg.status.value if hasattr(fg.status, "value") else str(fg.status),
            entered_at=fg.entered_at
        ))

    return results

@router.post("", response_model=DispatchResponse, status_code=status.HTTP_201_CREATED)
def create_dispatch(
    payload: DispatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """
    Atomic Dispatch Transaction:
    1. Validates order existence and status.
    2. Verifies selected rolls belong to the order and have passed inspection ('available').
    3. Strictly enforces no roll is dispatched twice.
    4. Generates Dispatch and DispatchItem records.
    5. Deducts finished goods inventory and advances order status.
    """
    order = db.query(CustomerOrder).filter(CustomerOrder.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Customer order not found")

    if not order.buyer_id:
        raise HTTPException(status_code=400, detail="Order does not have a linked buyer")

    # Check unique invoice number
    existing_inv = db.query(Dispatch).filter(Dispatch.invoice_number == payload.invoice_number.strip()).first()
    if existing_inv:
        raise HTTPException(status_code=400, detail=f"Invoice number '{payload.invoice_number}' already exists.")

    if len(payload.roll_ids) != len(set(payload.roll_ids)):
        raise HTTPException(status_code=400, detail="Duplicate roll IDs provided in dispatch request")

    # Validate rolls
    selected_rolls: List[FabricRoll] = []
    total_metres = 0.0

    for roll_id in payload.roll_ids:
        roll = db.query(FabricRoll).filter(FabricRoll.id == roll_id).first()
        if not roll:
            raise HTTPException(status_code=404, detail=f"Roll with ID {roll_id} not found")

        if roll.order_id != order.id:
            raise HTTPException(
                status_code=400,
                detail=f"Roll {roll.roll_number} belongs to order {roll.order_id}, not order {order.id}"
            )

        # Check finished good status
        fg = db.query(FinishedGood).filter(FinishedGood.roll_id == roll_id).first()
        if not fg or fg.status != FinishedGoodStatus.available:
            raise HTTPException(
                status_code=400,
                detail=f"Roll {roll.roll_number} is not in available finished goods (Status: {fg.status if fg else 'None'}). Must pass quality check first."
            )

        # Check double-dispatch
        existing_dispatch_item = db.query(DispatchItem).filter(DispatchItem.roll_id == roll_id).first()
        if existing_dispatch_item:
            raise HTTPException(
                status_code=400,
                detail=f"Roll {roll.roll_number} has already been dispatched in dispatch #{existing_dispatch_item.dispatch_id}"
            )

        selected_rolls.append(roll)
        total_metres += roll.length_metres

    if total_metres <= 0:
        raise HTTPException(status_code=400, detail="Total dispatch metres must be greater than zero")

    # Generate sequential unique dispatch number
    count = db.query(Dispatch).count()
    dispatch_number = f"DSP-{datetime.now().year}-{count + 1:04d}"

    dispatch = Dispatch(
        dispatch_number=dispatch_number,
        order_id=order.id,
        buyer_id=order.buyer_id,
        invoice_number=payload.invoice_number.strip(),
        total_metres=round(total_metres, 2),
        status="dispatched"
    )
    db.add(dispatch)
    db.flush()

    item_responses = []
    for roll in selected_rolls:
        d_item = DispatchItem(
            dispatch_id=dispatch.id,
            roll_id=roll.id,
            metres=roll.length_metres
        )
        db.add(d_item)

        # Transition finished good status
        fg = db.query(FinishedGood).filter(FinishedGood.roll_id == roll.id).first()
        if fg:
            fg.status = FinishedGoodStatus.dispatched

        item_responses.append(DispatchItemResponse(
            id=d_item.id if d_item.id else 0,
            roll_id=roll.id,
            roll_number=roll.roll_number,
            metres=roll.length_metres
        ))

    # Check total order fulfilment
    all_order_dispatched_metres = (
        db.query(func.coalesce(func.sum(Dispatch.total_metres), 0.0))
        .filter(Dispatch.order_id == order.id)
        .scalar()
    ) + total_metres

    if all_order_dispatched_metres >= order.quantity_metres:
        order.status = OrderStatus.completed
    else:
        order.status = OrderStatus.dispatched

    db.commit()
    db.refresh(dispatch)

    return build_dispatch_response(dispatch)

@router.get("/history", response_model=List[DispatchResponse])
def list_dispatch_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List past dispatches.
    - Admins, store managers, and accounts officers view all dispatches.
    - Buyers can only view dispatches for their own orders.
    """
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    query = db.query(Dispatch).order_by(Dispatch.created_at.desc())

    if role == "buyer":
        buyer = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
        if not buyer:
            return []
        query = query.filter(Dispatch.buyer_id == buyer.id)
    elif role not in ["admin", "store_manager", "accounts"]:
        raise HTTPException(status_code=403, detail="Not authorized to view dispatch history")

    dispatches = query.all()
    return [build_dispatch_response(d) for d in dispatches]

@router.get("/{dispatch_id}", response_model=DispatchResponse)
def get_dispatch_details(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve details of a single outward dispatch record.
    Enforces tenant privacy for buyers.
    """
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail=f"Dispatch with ID {dispatch_id} not found")

    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role == "buyer":
        buyer = db.query(Buyer).filter(Buyer.user_id == current_user.id).first()
        if not buyer or dispatch.buyer_id != buyer.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this dispatch")
    elif role not in ["admin", "store_manager", "accounts"]:
        raise HTTPException(status_code=403, detail="Not authorized to view dispatch details")

    return build_dispatch_response(dispatch)

@router.patch("/{dispatch_id}/status", response_model=DispatchResponse)
def update_dispatch_status(
    dispatch_id: int,
    payload: DispatchStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """
    Update outward dispatch delivery status.
    Workflow transitions:
    - ready_for_dispatch
    - dispatched
    - in_transit
    - delivered
    - delivery_failed

    Enforces:
    1. Authorized roles only ('admin', 'store_manager').
    2. Records delivery timestamp and user when delivered.
    3. Does not deduct finished goods inventory again.
    """
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail=f"Dispatch with ID {dispatch_id} not found")

    target_status = normalize_delivery_status(payload.status)
    dispatch.status = target_status

    if target_status == "delivered":
        dispatch.delivered_at = datetime.now(timezone.utc)
        dispatch.delivered_by_user_id = current_user.id
        if dispatch.order and dispatch.order.status == OrderStatus.dispatched:
            remaining_undelivered = db.query(Dispatch).filter(
                Dispatch.order_id == dispatch.order_id,
                Dispatch.id != dispatch.id,
                Dispatch.status != "delivered"
            ).count()
            if remaining_undelivered == 0:
                dispatch.order.status = OrderStatus.completed
    elif target_status in ["dispatched", "in_transit", "ready_for_dispatch", "delivery_failed"]:
        if target_status != "delivered" and dispatch.delivered_at is not None:
            # Revert delivery timestamp if transitioned away from delivered
            dispatch.delivered_at = None
            dispatch.delivered_by_user_id = None
            if dispatch.order and dispatch.order.status == OrderStatus.completed:
                dispatch.order.status = OrderStatus.dispatched

    db.commit()
    db.refresh(dispatch)
    return build_dispatch_response(dispatch)

@router.post("/{dispatch_id}/deliver", response_model=DispatchResponse)
def mark_dispatch_as_delivered(
    dispatch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "store_manager"))
):
    """
    Direct action: Mark a dispatched delivery as Delivered.
    Persists delivery timestamp and confirming user in PostgreSQL.
    Does not duplicate inventory deductions.
    """
    dispatch = db.query(Dispatch).filter(Dispatch.id == dispatch_id).first()
    if not dispatch:
        raise HTTPException(status_code=404, detail=f"Dispatch with ID {dispatch_id} not found")

    dispatch.status = "delivered"
    dispatch.delivered_at = datetime.now(timezone.utc)
    dispatch.delivered_by_user_id = current_user.id

    if dispatch.order and dispatch.order.status == OrderStatus.dispatched:
        remaining_undelivered = db.query(Dispatch).filter(
            Dispatch.order_id == dispatch.order_id,
            Dispatch.id != dispatch.id,
            Dispatch.status != "delivered"
        ).count()
        if remaining_undelivered == 0:
            dispatch.order.status = OrderStatus.completed

    db.commit()
    db.refresh(dispatch)
    return build_dispatch_response(dispatch)
