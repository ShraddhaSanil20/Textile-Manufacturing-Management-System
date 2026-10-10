from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.models.workers import Worker, AttendanceRecord, AttendanceStatus, WageRecord
from app.schemas.workers import (
    WorkerCreate,
    WorkerResponse,
    AttendanceCreate,
    AttendanceResponse,
    WageCalculateRequest,
    WageRecordResponse
)

router = APIRouter(prefix="/workers", tags=["Workers & Wages"])

@router.get("", response_model=List[WorkerResponse])
def list_workers(
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts", "production_operator"))
):
    """List workers master records with department filter and aggregate earnings."""
    query = db.query(Worker).order_by(Worker.id.asc())
    if department:
        query = query.filter(Worker.department.ilike(f"%{department}%"))

    workers = query.all()
    results = []

    for w in workers:
        total_att = len([a for a in w.attendance_records if a.status == AttendanceStatus.present])
        total_wages = sum(wr.total_wage for wr in w.wage_records)

        resp = WorkerResponse.model_validate(w)
        resp.total_attendance_days = total_att
        resp.total_wages_earned = round(total_wages, 2)
        results.append(resp)

    return results

@router.post("", response_model=WorkerResponse, status_code=status.HTTP_201_CREATED)
def create_worker(
    payload: WorkerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts"))
):
    """Enroll a new factory worker with department and hourly wage rate."""
    existing = db.query(Worker).filter(Worker.employee_code == payload.employee_code.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Worker with employee code '{payload.employee_code}' already exists."
        )

    worker = Worker(
        full_name=payload.full_name.strip(),
        employee_code=payload.employee_code.strip(),
        department=payload.department.strip(),
        hourly_wage=payload.hourly_wage
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)

    resp = WorkerResponse.model_validate(worker)
    resp.total_attendance_days = 0
    resp.total_wages_earned = 0.0
    return resp

@router.get("/attendance", response_model=List[AttendanceResponse])
def list_attendance(
    worker_id: Optional[int] = Query(None),
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts", "production_operator"))
):
    """List worker daily attendance records."""
    query = db.query(AttendanceRecord).order_by(AttendanceRecord.date.desc())
    if worker_id:
        query = query.filter(AttendanceRecord.worker_id == worker_id)

    records = query.limit(limit).all()
    results = []

    for r in records:
        w = r.worker
        results.append(AttendanceResponse(
            id=r.id,
            worker_id=r.worker_id,
            worker_name=w.full_name if w else "Unknown",
            employee_code=w.employee_code if w else "N/A",
            department=w.department if w else "N/A",
            date=r.date,
            shift=r.shift,
            hours_worked=r.hours_worked,
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            created_at=r.created_at
        ))

    return results

@router.post("/attendance", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def log_attendance(
    payload: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts", "production_operator"))
):
    """Log daily worker shift attendance and hours worked."""
    worker = db.query(Worker).filter(Worker.id == payload.worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    rec = AttendanceRecord(
        worker_id=payload.worker_id,
        date=payload.date,
        shift=payload.shift,
        hours_worked=payload.hours_worked,
        status=payload.status
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    return AttendanceResponse(
        id=rec.id,
        worker_id=rec.worker_id,
        worker_name=worker.full_name,
        employee_code=worker.employee_code,
        department=worker.department,
        date=rec.date,
        shift=rec.shift,
        hours_worked=rec.hours_worked,
        status=rec.status.value if hasattr(rec.status, "value") else str(rec.status),
        created_at=rec.created_at
    )

@router.get("/wages", response_model=List[WageRecordResponse])
def list_wages(
    worker_id: Optional[int] = Query(None),
    is_paid: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts"))
):
    """List calculated wage records."""
    query = db.query(WageRecord).order_by(WageRecord.period_end.desc())
    if worker_id:
        query = query.filter(WageRecord.worker_id == worker_id)
    if is_paid is not None:
        query = query.filter(WageRecord.is_paid == is_paid)

    records = query.all()
    results = []

    for wr in records:
        w = wr.worker
        results.append(WageRecordResponse(
            id=wr.id,
            worker_id=wr.worker_id,
            worker_name=w.full_name if w else "Unknown",
            employee_code=w.employee_code if w else "N/A",
            department=w.department if w else "N/A",
            period_start=wr.period_start,
            period_end=wr.period_end,
            regular_wages=wr.regular_wages,
            overtime_wages=wr.overtime_wages,
            total_wage=wr.total_wage,
            is_paid=wr.is_paid,
            created_at=wr.created_at
        ))

    return results

@router.post("/wages/calculate", response_model=List[WageRecordResponse], status_code=status.HTTP_201_CREATED)
def calculate_wages_for_period(
    payload: WageCalculateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts"))
):
    """
    Calculate and generate wage records for factory workers based on attendance hours:
    - Regular hours (up to 8 hrs/shift): standard hourly_wage
    - Overtime hours (> 8 hrs/shift): 1.5x hourly_wage
    """
    if payload.period_start > payload.period_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="period_start must be before or equal to period_end"
        )

    if payload.worker_id:
        target_worker = db.query(Worker).filter(Worker.id == payload.worker_id).first()
        if not target_worker:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found")
        workers = [target_worker]
    else:
        workers = db.query(Worker).all()

    created_wages = []

    for w in workers:
        attendance = (
            db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.worker_id == w.id,
                AttendanceRecord.status == AttendanceStatus.present,
                AttendanceRecord.date >= payload.period_start,
                AttendanceRecord.date <= payload.period_end
            )
            .all()
        )

        if not attendance:
            continue

        regular_hours = 0.0
        overtime_hours = 0.0

        for att in attendance:
            reg = min(att.hours_worked, 8.0)
            ot = max(0.0, att.hours_worked - 8.0)
            regular_hours += reg
            overtime_hours += ot

        regular_wages = round(regular_hours * w.hourly_wage, 2)
        overtime_wages = round(overtime_hours * (w.hourly_wage * 1.5), 2)
        total_wage = round(regular_wages + overtime_wages, 2)

        wage_rec = WageRecord(
            worker_id=w.id,
            period_start=payload.period_start,
            period_end=payload.period_end,
            regular_wages=regular_wages,
            overtime_wages=overtime_wages,
            total_wage=total_wage,
            is_paid=False
        )
        db.add(wage_rec)
        db.flush()

        created_wages.append(WageRecordResponse(
            id=wage_rec.id,
            worker_id=w.id,
            worker_name=w.full_name,
            employee_code=w.employee_code,
            department=w.department,
            period_start=wage_rec.period_start,
            period_end=wage_rec.period_end,
            regular_wages=wage_rec.regular_wages,
            overtime_wages=wage_rec.overtime_wages,
            total_wage=wage_rec.total_wage,
            is_paid=wage_rec.is_paid,
            created_at=wage_rec.created_at
        ))

    db.commit()
    return created_wages

@router.patch("/wages/{wage_id}/pay", response_model=WageRecordResponse)
def mark_wage_as_paid(
    wage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts"))
):
    """Mark wage record as disbursed/paid to worker."""
    wr = db.query(WageRecord).filter(WageRecord.id == wage_id).first()
    if not wr:
        raise HTTPException(status_code=404, detail="Wage record not found")

    wr.is_paid = True
    db.commit()
    db.refresh(wr)

    w = wr.worker
    return WageRecordResponse(
        id=wr.id,
        worker_id=wr.worker_id,
        worker_name=w.full_name if w else "Unknown",
        employee_code=w.employee_code if w else "N/A",
        department=w.department if w else "N/A",
        period_start=wr.period_start,
        period_end=wr.period_end,
        regular_wages=wr.regular_wages,
        overtime_wages=wr.overtime_wages,
        total_wage=wr.total_wage,
        is_paid=wr.is_paid,
        created_at=wr.created_at
    )
