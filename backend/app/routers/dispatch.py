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
from app.models.dispatch import FinishedGood, FinishedGoodStatus, Dispatch, DispatchItem
from app.schemas.dispatch import (
    AvailableFinishedGoodResponse,
    DispatchCreate,
    DispatchResponse,
    DispatchItemResponse
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

    return DispatchResponse(
        id=dispatch.id,
        dispatch_number=dispatch.dispatch_number,
        order_id=dispatch.order_id,
        order_number=order.order_number,
        buyer_id=dispatch.buyer_id,
        buyer_name=order.buyer.company_name if order.buyer else "N/A",
        invoice_number=dispatch.invoice_number,
        total_metres=dispatch.total_metres,
        status=dispatch.status,
        dispatch_date=dispatch.dispatch_date,
        created_at=dispatch.created_at,
        items=item_responses
    )

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
    results = []

    for d in dispatches:
        items = [
            DispatchItemResponse(
                id=it.id,
                roll_id=it.roll_id,
                roll_number=it.roll.roll_number if it.roll else f"Roll #{it.roll_id}",
                metres=it.metres
            )
            for it in d.items
        ]

        results.append(DispatchResponse(
            id=d.id,
            dispatch_number=d.dispatch_number,
            order_id=d.order_id,
            order_number=d.order.order_number if d.order else "N/A",
            buyer_id=d.buyer_id,
            buyer_name=d.buyer.company_name if d.buyer else "N/A",
            invoice_number=d.invoice_number,
            total_metres=d.total_metres,
            status=d.status,
            dispatch_date=d.dispatch_date,
            created_at=d.created_at,
            items=items
        ))

    return results
