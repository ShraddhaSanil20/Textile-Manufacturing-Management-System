import os
import sys
from datetime import datetime, timezone, timedelta

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.orders import Buyer, CustomerOrder, OrderStatus
from app.models.inventory import Supplier, RawMaterial, StockMovement, StockMovementType
from app.models.production import Machine, MachineType, MachineStatus, ProductionBatch, ProductionStage, ShiftType, BatchStatus, FabricRoll
from app.models.quality import QualityInspection, InspectionResult, DefectCategory
from app.models.dispatch import FinishedGood, FinishedGoodStatus, Dispatch, DispatchItem
from app.models.workers import Worker, AttendanceRecord, AttendanceStatus, WageRecord
from app.models.finance import Expense, ExpenseCategory, Payment, PaymentMethod, PaymentStatus
from app.core.security import hash_password, normalize_email

DEMO_USERS = [
    {
        "full_name": "Demo Admin",
        "email": "admin@everest.test",
        "password": "Admin@123",
        "role": UserRole.admin,
    },
    {
        "full_name": "Demo Store Manager",
        "email": "store@everest.test",
        "password": "Store@123",
        "role": UserRole.store_manager,
    },
    {
        "full_name": "Demo Production Operator",
        "email": "production@everest.test",
        "password": "Prod@123",
        "role": UserRole.production_operator,
    },
    {
        "full_name": "Demo Quality Inspector",
        "email": "quality@everest.test",
        "password": "Quality@123",
        "role": UserRole.quality_inspector,
    },
    {
        "full_name": "Demo Accounts Officer",
        "email": "accounts@everest.test",
        "password": "Accounts@123",
        "role": UserRole.accounts,
    },
    {
        "full_name": "Demo Fabric Buyer",
        "email": "buyer@everest.test",
        "password": "Buyer@123",
        "role": UserRole.buyer,
    },
]

def seed_all():
    """
    Comprehensive, idempotent seeding script for Everest Textile Mills.
    Sets up users, suppliers, raw materials, machines, workers, and a complete
    end-to-end 1,000m Blue Cotton fabric order with full genealogy.
    """
    db = SessionLocal()
    try:
        print("[DEMO SEED] Starting comprehensive database seed...")

        # 1. Seed Users
        users_by_email = {}
        for user_data in DEMO_USERS:
            email = normalize_email(user_data["email"])
            existing = db.query(User).filter(User.email == email).first()
            hashed_pw = hash_password(user_data["password"])

            if existing:
                existing.full_name = user_data["full_name"]
                existing.hashed_password = hashed_pw
                existing.role = user_data["role"]
                existing.is_active = True
                users_by_email[email] = existing
            else:
                new_user = User(
                    full_name=user_data["full_name"],
                    email=email,
                    hashed_password=hashed_pw,
                    role=user_data["role"],
                    is_active=True
                )
                db.add(new_user)
                db.flush()
                users_by_email[email] = new_user

        db.commit()
        print("[DEMO SEED] Users verified.")

        # 2. Seed Buyer Profile
        buyer_user = users_by_email["buyer@everest.test"]
        buyer = db.query(Buyer).filter(Buyer.user_id == buyer_user.id).first()
        if not buyer:
            buyer = Buyer(
                user_id=buyer_user.id,
                company_name="Apex Garments International",
                phone="+91 98200 12345",
                address="Plot 44, Export Apparel Zone, Mumbai"
            )
            db.add(buyer)
            db.commit()
            db.refresh(buyer)

        # 3. Seed Suppliers
        suppliers_data = [
            ("National Yarn Spinners Ltd", "Rajesh Singhania", "+91 98110 55443", "sales@nationalyarn.test", "Coimbatore, Tamil Nadu"),
            ("Vibrant Dyes & Chemical Corp", "Anita Desai", "+91 98220 77889", "orders@vibrantdyes.test", "Ahmedabad, Gujarat")
        ]
        suppliers = []
        for s_name, cp, phone, email, addr in suppliers_data:
            s = db.query(Supplier).filter(Supplier.name == s_name).first()
            if not s:
                s = Supplier(name=s_name, contact_person=cp, phone=phone, email=email, address=addr)
                db.add(s)
                db.flush()
            suppliers.append(s)
        db.commit()

        # 4. Seed Raw Materials
        materials_data = [
            ("Navy Blue Cotton 30s", "Navy Blue", 650.0, "kg", 150.0),
            ("White Combed Cotton 40s", "Optical White", 500.0, "kg", 200.0),
            ("Polyester Filament 150D", "Charcoal Grey", 80.0, "kg", 100.0), # Low stock alert trigger
            ("Gold Silk 100D", "Canary Gold", 120.0, "kg", 100.0),
        ]
        mats = []
        for yarn_t, col, qty, unit, reorder in materials_data:
            m = db.query(RawMaterial).filter(RawMaterial.yarn_type == yarn_t, RawMaterial.colour == col).first()
            if not m:
                m = RawMaterial(yarn_type=yarn_t, colour=col, quantity_on_hand=qty, unit=unit, reorder_threshold=reorder)
                db.add(m)
                db.flush()
            mats.append(m)
        db.commit()

        # 5. Seed Machine Fleet
        machines_data = [
            ("Spinning Ring Frame SF-01", MachineType.spinning, MachineStatus.running),
            ("Air-Jet Weaving Loom WL-01", MachineType.weaving, MachineStatus.running),
            ("High-Temp Dyeing Jet DJ-01", MachineType.dyeing, MachineStatus.idle),
            ("Shuttle Loom SL-02", MachineType.weaving, MachineStatus.maintenance),
        ]
        fleet = []
        for m_name, m_type, m_stat in machines_data:
            mac = db.query(Machine).filter(Machine.name == m_name).first()
            if not mac:
                mac = Machine(name=m_name, type=m_type, status=m_stat)
                db.add(mac)
                db.flush()
            fleet.append(mac)
        db.commit()

        # 6. Seed Workers Roster
        workers_data = [
            ("Ramesh Kumar Sharma", "WRK-001", "weaving", 20.0),
            ("Sunil Verma", "WRK-002", "spinning", 18.5),
            ("Anil Deshmukh", "WRK-003", "dyeing", 21.0),
        ]
        workers = []
        for w_name, code, dept, rate in workers_data:
            w = db.query(Worker).filter(Worker.employee_code == code).first()
            if not w:
                w = Worker(full_name=w_name, employee_code=code, department=dept, hourly_wage=rate)
                db.add(w)
                db.flush()
            workers.append(w)
        db.commit()

        # Seed sample attendance and wage slip
        w1 = workers[0]
        att = db.query(AttendanceRecord).filter(AttendanceRecord.worker_id == w1.id).first()
        if not att:
            today = datetime.now(timezone.utc)
            db.add(AttendanceRecord(worker_id=w1.id, date=today - timedelta(days=2), shift="morning", hours_worked=8.0, status=AttendanceStatus.present))
            db.add(AttendanceRecord(worker_id=w1.id, date=today - timedelta(days=1), shift="evening", hours_worked=10.0, status=AttendanceStatus.present))
            db.flush()

            # Wage record: 16 hrs regular ($320) + 2 hrs OT ($60) = $380
            db.add(WageRecord(
                worker_id=w1.id,
                period_start=today - timedelta(days=3),
                period_end=today,
                regular_wages=320.0,
                overtime_wages=60.0,
                total_wage=380.0,
                is_paid=True
            ))
            db.commit()

        # 7. Seed End-to-End Demo Order (1,000m Blue Cotton Poplin 40s)
        order_num = "ORD-2026-DEMO-01"
        order = db.query(CustomerOrder).filter(CustomerOrder.order_number == order_num).first()
        if not order:
            order = CustomerOrder(
                order_number=order_num,
                buyer_id=buyer.id,
                fabric_type="Royal Blue Cotton Poplin 40s",
                colour="Navy Blue",
                quantity_metres=1000.0,
                due_date=datetime.now(timezone.utc) + timedelta(days=10),
                status=OrderStatus.dispatched,
                unit_price=5.20,
                total_revenue=5200.0
            )
            db.add(order)
            db.flush()

            # Batch 1: Weaving
            batch = ProductionBatch(
                batch_number="BAT-DEMO-001",
                order_id=order.id,
                stage=ProductionStage.weaving,
                machine_id=fleet[1].id,
                shift=ShiftType.morning,
                output_metres=1000.0,
                downtime_minutes=25.0,
                status=BatchStatus.completed,
                start_time=datetime.now(timezone.utc) - timedelta(days=4),
                end_time=datetime.now(timezone.utc) - timedelta(days=3)
            )
            db.add(batch)
            db.flush()

            # Rolls (10 rolls of 100m)
            rolls = []
            for i in range(1, 11):
                roll = FabricRoll(
                    roll_number=f"ROL-DEMO-{i:04d}",
                    order_id=order.id,
                    batch_id=batch.id,
                    machine_id=fleet[1].id,
                    length_metres=100.0
                )
                db.add(roll)
                db.flush()
                rolls.append(roll)

            # Quality Inspections
            qi_user = users_by_email["quality@everest.test"]
            for idx, r in enumerate(rolls):
                if idx < 8:
                    # 8 Passed Grade A
                    db.add(QualityInspection(
                        roll_id=r.id,
                        inspector_id=qi_user.id,
                        result=InspectionResult.passed,
                        defect_category=DefectCategory.none,
                        notes="Grade A inspection pass. Flawless weft structure."
                    ))
                    db.add(FinishedGood(roll_id=r.id, status=FinishedGoodStatus.available))
                elif idx == 8:
                    # 1 Rework
                    db.add(QualityInspection(
                        roll_id=r.id,
                        inspector_id=qi_user.id,
                        result=InspectionResult.rework,
                        defect_category=DefectCategory.weave_flaw,
                        notes="Loose selvage tension at 45m mark. Re-roll required."
                    ))
                else:
                    # 1 Rejected
                    db.add(QualityInspection(
                        roll_id=r.id,
                        inspector_id=qi_user.id,
                        result=InspectionResult.rejected,
                        defect_category=DefectCategory.stain,
                        notes="Oil drippage across 20m of fabric. Scrap."
                    ))
            db.flush()

            # Dispatch 5 passed rolls (500m)
            disp = Dispatch(
                dispatch_number="DSP-2026-DEMO-01",
                order_id=order.id,
                buyer_id=buyer.id,
                invoice_number="INV-2026-DEMO-01",
                total_metres=500.0,
                status="dispatched"
            )
            db.add(disp)
            db.flush()

            for r in rolls[:5]:
                db.add(DispatchItem(dispatch_id=disp.id, roll_id=r.id, metres=100.0))
                fg = db.query(FinishedGood).filter(FinishedGood.roll_id == r.id).first()
                if fg:
                    fg.status = FinishedGoodStatus.dispatched
            db.flush()

            # Linked Direct Expense ($420 Reactive Blue Dye)
            db.add(Expense(
                order_id=order.id,
                category=ExpenseCategory.dye_chemicals,
                amount=420.0,
                description="Reactive Navy Blue 200% dye and salt fixatives"
            ))

            # Linked Buyer Payment ($3,000 Bank Wire)
            db.add(Payment(
                order_id=order.id,
                buyer_id=buyer.id,
                amount=3000.0,
                payment_method=PaymentMethod.bank_transfer,
                status=PaymentStatus.received,
                transaction_reference="HDFC-RTGS-DEMO-991"
            ))

            db.commit()
            print("[DEMO SEED] End-to-end demo order created successfully.")

        print("[DEMO SEED] Database seeding finished successfully!")

    except Exception as e:
        db.rollback()
        print(f"[DEMO SEED ERROR] Seed execution failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_all()
