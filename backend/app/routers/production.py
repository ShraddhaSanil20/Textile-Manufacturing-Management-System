from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.production import (
    Machine, MachineType, MachineStatus,
    ProductionBatch, ProductionStage, ShiftType, BatchStatus,
    FabricRoll
)
from app.models.orders import CustomerOrder, OrderStatus
from app.schemas.production import (
    MachineCreate, MachineResponse, MachineStatusUpdate,
    ProductionBatchCreate, ProductionBatchResponse, BatchOutputRecord,
    DelayedOrderResponse
)
from app.core.deps import require_roles

router = APIRouter(prefix="/production", tags=["production"])

@router.get("/machines", response_model=List[MachineResponse])
def list_machines(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "production_operator", "store_manager"))
):
    """List all machines in the factory fleet with active batch information."""
    machines = db.query(Machine).order_by(Machine.type.asc(), Machine.name.asc()).all()
    results = []
    for m in machines:
        resp = MachineResponse.model_validate(m)
        active_batch = (
            db.query(ProductionBatch)
            .filter(ProductionBatch.machine_id == m.id, ProductionBatch.status == BatchStatus.in_progress)
            .first()
        )
        if active_batch:
            resp.active_batch_number = active_batch.batch_number
        results.append(resp)
    return results

@router.post("/machines", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(
    machine_in: MachineCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "production_operator"))
):
    """Add a new machine to the mill fleet."""
    existing = db.query(Machine).filter(Machine.name == machine_in.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Machine with this name already exists")

    machine = Machine(
        name=machine_in.name.strip(),
        type=machine_in.type,
        status=machine_in.status
    )
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return MachineResponse.model_validate(machine)

@router.patch("/machines/{machine_id}/status", response_model=MachineResponse)
def update_machine_status(
    machine_id: int,
    status_update: MachineStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "production_operator"))
):
    """Update machine status (idle, running, maintenance, error)."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    machine.status = status_update.status
    db.commit()
    db.refresh(machine)
    return MachineResponse.model_validate(machine)

@router.get("/batches", response_model=List[ProductionBatchResponse])
def list_batches(
    stage: Optional[ProductionStage] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "production_operator", "store_manager"))
):
    """List production batches with stage, machine, output, and downtime metrics."""
    query = db.query(ProductionBatch)
    if stage:
        query = query.filter(ProductionBatch.stage == stage)

    batches = query.order_by(ProductionBatch.start_time.desc()).all()
    results = []
    for b in batches:
        resp = ProductionBatchResponse.model_validate(b)
        if b.order:
            resp.order_number = b.order.order_number
        if b.machine:
            resp.machine_name = b.machine.name
        resp.fabric_rolls_count = len(b.fabric_rolls)
        results.append(resp)
    return results

@router.post("/batches", response_model=ProductionBatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    batch_in: ProductionBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "production_operator"))
):
    """
    Assign an order to a machine for a production stage (spinning, weaving, dyeing).
    Sets machine to 'running' and updates order to 'in_production'.
    """
    order = db.query(CustomerOrder).filter(CustomerOrder.id == batch_in.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    machine = db.query(Machine).filter(Machine.id == batch_in.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    # Generate sequential batch number
    count = db.query(ProductionBatch).count()
    batch_number = f"BAT-{batch_in.stage.value[:3].upper()}-{count + 1:04d}"

    batch = ProductionBatch(
        batch_number=batch_number,
        order_id=order.id,
        stage=batch_in.stage,
        machine_id=machine.id,
        shift=batch_in.shift,
        output_metres=batch_in.output_metres,
        downtime_minutes=batch_in.downtime_minutes,
        status=BatchStatus.in_progress,
        start_time=datetime.now(timezone.utc)
    )
    db.add(batch)

    # Update machine status to running
    machine.status = MachineStatus.running

    # Advance order status if created or material_check
    if order.status in [OrderStatus.created, OrderStatus.material_check]:
        order.status = OrderStatus.in_production

    db.commit()
    db.refresh(batch)

    resp = ProductionBatchResponse.model_validate(batch)
    resp.order_number = order.order_number
    resp.machine_name = machine.name
    return resp

@router.post("/batches/{batch_id}/output", response_model=ProductionBatchResponse)
def record_batch_output(
    batch_id: int,
    output_in: BatchOutputRecord,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "production_operator"))
):
    """
    Record output metres and downtime from a shift run.
    Optionally auto-creates serialized FabricRoll units (100m rolls) and frees machine if completed.
    """
    batch = db.query(ProductionBatch).filter(ProductionBatch.id == batch_id).with_for_update().first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch.output_metres += output_in.output_metres
    batch.downtime_minutes += output_in.downtime_minutes

    # If rolls requested, generate fabric rolls for this output
    if output_in.create_fabric_rolls and output_in.output_metres > 0:
        roll_length = 100.0  # Standard roll length in metres
        num_rolls = max(1, int(output_in.output_metres // roll_length))
        remainder = output_in.output_metres % roll_length

        total_rolls = db.query(FabricRoll).count()
        for i in range(num_rolls):
            roll_number = f"ROL-{total_rolls + i + 1:05d}"
            roll = FabricRoll(
                roll_number=roll_number,
                order_id=batch.order_id,
                batch_id=batch.id,
                machine_id=batch.machine_id,
                length_metres=roll_length
            )
            db.add(roll)

        if remainder > 0 and num_rolls == 0:
            total_rolls = db.query(FabricRoll).count()
            roll_number = f"ROL-{total_rolls + 1:05d}"
            roll = FabricRoll(
                roll_number=roll_number,
                order_id=batch.order_id,
                batch_id=batch.id,
                machine_id=batch.machine_id,
                length_metres=round(remainder, 2)
            )
            db.add(roll)

    if output_in.mark_completed:
        batch.status = BatchStatus.completed
        batch.end_time = datetime.now(timezone.utc)
        if batch.machine:
            batch.machine.status = MachineStatus.idle

    db.commit()
    db.refresh(batch)

    resp = ProductionBatchResponse.model_validate(batch)
    if batch.order:
        resp.order_number = batch.order.order_number
    if batch.machine:
        resp.machine_name = batch.machine.name
    resp.fabric_rolls_count = len(batch.fabric_rolls)
    return resp

@router.get("/delayed-orders", response_model=List[DelayedOrderResponse])
def get_delayed_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "production_operator", "store_manager"))
):
    """Highlight delayed or at-risk customer orders."""
    now = datetime.now(timezone.utc)
    orders = (
        db.query(CustomerOrder)
        .filter(CustomerOrder.status.notin_([OrderStatus.dispatched, OrderStatus.completed]))
        .order_by(CustomerOrder.due_date.asc())
        .all()
    )

    results = []
    for ord in orders:
        produced = sum(r.length_metres for r in ord.fabric_rolls)
        # Ensure timezone-aware comparison
        due = ord.due_date if ord.due_date.tzinfo else ord.due_date.replace(tzinfo=timezone.utc)
        days_rem = (due - now).days
        is_delayed = days_rem <= 2 or produced < (ord.quantity_metres * 0.5 and days_rem <= 5)

        results.append(DelayedOrderResponse(
            order_id=ord.id,
            order_number=ord.order_number,
            fabric_type=ord.fabric_type,
            colour=ord.colour,
            ordered_metres=ord.quantity_metres,
            produced_metres=produced,
            due_date=due,
            days_remaining=days_rem,
            is_delayed=is_delayed
        ))
    return results
