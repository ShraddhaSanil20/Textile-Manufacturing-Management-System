import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.exc import IntegrityError
from app.models.user import User, UserRole
from app.models.inventory import Supplier, RawMaterial, StockMovement, StockMovementType
from app.models.orders import Buyer, CustomerOrder, OrderStatus
from app.models.production import (
    Machine, MachineType, MachineStatus,
    ProductionBatch, ProductionStage, ShiftType, BatchStatus,
    FabricRoll
)
from app.models.quality import QualityInspection, InspectionResult, DefectCategory
from app.models.dispatch import FinishedGood, FinishedGoodStatus, Dispatch, DispatchItem
from app.models.workers import Worker, AttendanceRecord, AttendanceStatus, WageRecord
from app.models.finance import Expense, ExpenseCategory, Payment, PaymentMethod, PaymentStatus

def test_inventory_and_stock_movements(db_session):
    """Test creating supplier, raw material, and stock movements."""
    supplier = Supplier(
        name="Vardhman Textiles Ltd",
        contact_person="Ramesh Sharma",
        phone="+91-9876543210",
        email="ramesh@vardhman.test",
        address="Ludhiana, Punjab"
    )
    db_session.add(supplier)
    db_session.flush()

    material = RawMaterial(
        yarn_type="Cotton 30s Combed",
        colour="Royal Blue",
        quantity_on_hand=500.0,
        unit="kg",
        reorder_threshold=150.0
    )
    db_session.add(material)
    db_session.flush()

    movement = StockMovement(
        material_id=material.id,
        movement_type=StockMovementType.received,
        quantity=500.0,
        supplier_id=supplier.id,
        notes="Initial lot received from Vardhman"
    )
    db_session.add(movement)
    db_session.commit()

    assert material.id is not None
    assert supplier.id is not None
    assert movement.id is not None
    assert len(material.stock_movements) == 1
    assert material.stock_movements[0].supplier.name == "Vardhman Textiles Ltd"

def test_raw_material_check_constraint_rejects_negative_stock(db_session):
    """Test that check constraint chk_raw_material_quantity rejects negative quantity."""
    invalid_material = RawMaterial(
        yarn_type="Polyester 50D",
        colour="White",
        quantity_on_hand=-20.0,  # Negative quantity violates check constraint
        unit="kg",
        reorder_threshold=50.0
    )
    db_session.add(invalid_material)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_buyer_and_order_flow(db_session):
    """Test buyer linking to user, and customer order creation."""
    buyer_user = db_session.query(User).filter(User.email == "buyer@everest.test").first()
    assert buyer_user is not None

    # Check or create buyer profile
    buyer = db_session.query(Buyer).filter(Buyer.user_id == buyer_user.id).first()
    if not buyer:
        buyer = Buyer(
            user_id=buyer_user.id,
            company_name="Apex Global Apparel",
            phone="+91-9812345678",
            address="Tirupur, Tamil Nadu"
        )
        db_session.add(buyer)
        db_session.flush()

    order = CustomerOrder(
        order_number=f"ORD-TEST-{int(datetime.now().timestamp())}",
        buyer_id=buyer.id,
        fabric_type="Blue Cotton Poplin",
        colour="Navy Blue",
        quantity_metres=1000.0,
        due_date=datetime.now(timezone.utc) + timedelta(days=14),
        status=OrderStatus.created,
        unit_price=4.50,
        total_revenue=4500.0
    )
    db_session.add(order)
    db_session.commit()

    assert order.id is not None
    assert order.buyer.company_name == "Apex Global Apparel"
    assert order.status == OrderStatus.created

def test_production_quality_and_dispatch_pipeline(db_session):
    """
    Test end-to-end production flow:
    Machine -> ProductionBatch -> FabricRoll -> QualityInspection -> FinishedGood -> Dispatch
    and verifies that duplicate roll dispatch is strictly blocked.
    """
    # 1. Setup machine
    machine_name = f"Loom-TEST-{int(datetime.now().timestamp())}"
    machine = Machine(
        name=machine_name,
        type=MachineType.weaving,
        status=MachineStatus.running
    )
    db_session.add(machine)
    db_session.flush()

    # 2. Setup order
    buyer_user = db_session.query(User).filter(User.email == "buyer@everest.test").first()
    buyer = db_session.query(Buyer).filter(Buyer.user_id == buyer_user.id).first()
    order = CustomerOrder(
        order_number=f"ORD-PIPE-{int(datetime.now().timestamp())}",
        buyer_id=buyer.id,
        fabric_type="Cotton Weave 60s",
        colour="Sky Blue",
        quantity_metres=500.0,
        due_date=datetime.now(timezone.utc) + timedelta(days=7),
        status=OrderStatus.in_production,
        unit_price=5.00,
        total_revenue=2500.0
    )
    db_session.add(order)
    db_session.flush()

    # 3. Create batch
    batch = ProductionBatch(
        batch_number=f"BAT-TEST-{int(datetime.now().timestamp())}",
        order_id=order.id,
        stage=ProductionStage.weaving,
        machine_id=machine.id,
        shift=ShiftType.morning,
        output_metres=100.0,
        downtime_minutes=15,
        status=BatchStatus.completed
    )
    db_session.add(batch)
    db_session.flush()

    # 4. Create FabricRoll
    roll = FabricRoll(
        roll_number=f"ROL-TEST-{int(datetime.now().timestamp())}",
        order_id=order.id,
        batch_id=batch.id,
        machine_id=machine.id,
        length_metres=100.0
    )
    db_session.add(roll)
    db_session.flush()

    # 5. Quality Inspection (passed)
    inspector = db_session.query(User).filter(User.email == "quality@everest.test").first()
    inspection = QualityInspection(
        roll_id=roll.id,
        inspector_id=inspector.id,
        result=InspectionResult.passed,
        defect_category=DefectCategory.none,
        notes="Passed first-grade fabric inspection"
    )
    db_session.add(inspection)
    db_session.flush()

    # 6. Finished Goods Entry
    fg = FinishedGood(
        roll_id=roll.id,
        status=FinishedGoodStatus.available
    )
    db_session.add(fg)
    db_session.flush()

    # 7. Dispatch Creation
    dispatch = Dispatch(
        dispatch_number=f"DSP-TEST-{int(datetime.now().timestamp())}",
        order_id=order.id,
        buyer_id=buyer.id,
        invoice_number=f"INV-TEST-{int(datetime.now().timestamp())}",
        total_metres=100.0,
        status="dispatched"
    )
    db_session.add(dispatch)
    db_session.flush()

    dispatch_item = DispatchItem(
        dispatch_id=dispatch.id,
        roll_id=roll.id,
        metres=100.0
    )
    db_session.add(dispatch_item)
    fg.status = FinishedGoodStatus.dispatched
    db_session.commit()

    assert dispatch_item.id is not None
    assert fg.status == FinishedGoodStatus.dispatched

    # 8. Crucial Business Rule Test: Prevent dispatching the SAME roll twice!
    second_dispatch = Dispatch(
        dispatch_number=f"DSP-DUP-{int(datetime.now().timestamp())}",
        order_id=order.id,
        buyer_id=buyer.id,
        invoice_number=f"INV-DUP-{int(datetime.now().timestamp())}",
        total_metres=100.0,
        status="dispatched"
    )
    db_session.add(second_dispatch)
    db_session.flush()

    duplicate_item = DispatchItem(
        dispatch_id=second_dispatch.id,
        roll_id=roll.id,  # Attempting to dispatch already dispatched roll!
        metres=100.0
    )
    db_session.add(duplicate_item)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

def test_workers_and_wages(db_session):
    """Test worker registration, attendance logging, and wage calculation."""
    worker = Worker(
        full_name="Sunil Kumar",
        employee_code=f"EMP-TEST-{int(datetime.now().timestamp())}",
        department="weaving",
        hourly_wage=85.0
    )
    db_session.add(worker)
    db_session.flush()

    today = datetime.now(timezone.utc)
    attendance = AttendanceRecord(
        worker_id=worker.id,
        date=today,
        shift="morning",
        hours_worked=8.0,
        status=AttendanceStatus.present
    )
    db_session.add(attendance)
    db_session.flush()

    wage = WageRecord(
        worker_id=worker.id,
        period_start=today - timedelta(days=7),
        period_end=today,
        regular_wages=8.0 * 85.0 * 6,
        overtime_wages=0.0,
        total_wage=4080.0,
        is_paid=False
    )
    db_session.add(wage)
    db_session.commit()

    assert worker.id is not None
    assert attendance.id is not None
    assert wage.id is not None
    assert wage.total_wage == 4080.0

def test_expenses_and_payments(db_session):
    """Test recording production expenses and buyer payments."""
    buyer_user = db_session.query(User).filter(User.email == "buyer@everest.test").first()
    buyer = db_session.query(Buyer).filter(Buyer.user_id == buyer_user.id).first()
    order = db_session.query(CustomerOrder).first()

    expense = Expense(
        order_id=order.id,
        category=ExpenseCategory.dye_chemicals,
        amount=350.0,
        description="Reactive blue dyes and salt chemicals"
    )
    db_session.add(expense)

    payment = Payment(
        order_id=order.id,
        buyer_id=buyer.id,
        amount=2000.0,
        payment_method=PaymentMethod.bank_transfer,
        status=PaymentStatus.received,
        transaction_reference="NEFT-EVR-98214"
    )
    db_session.add(payment)
    db_session.commit()

    assert expense.id is not None
    assert payment.id is not None
    assert payment.status == PaymentStatus.received
