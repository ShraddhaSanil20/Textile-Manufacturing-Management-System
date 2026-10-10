from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.workers import AttendanceStatus

class WorkerCreate(BaseModel):
    full_name: str
    employee_code: str
    department: str
    hourly_wage: float = Field(..., ge=0.0)

class WorkerResponse(BaseModel):
    id: int
    full_name: str
    employee_code: str
    department: str
    hourly_wage: float
    created_at: datetime
    total_attendance_days: int = 0
    total_wages_earned: float = 0.0

    model_config = ConfigDict(from_attributes=True)

class AttendanceCreate(BaseModel):
    worker_id: int
    date: datetime
    shift: str = "morning"
    hours_worked: float = Field(default=8.0, ge=0.0)
    status: AttendanceStatus = AttendanceStatus.present

class AttendanceResponse(BaseModel):
    id: int
    worker_id: int
    worker_name: str
    employee_code: str
    department: str
    date: datetime
    shift: str
    hours_worked: float
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WageCalculateRequest(BaseModel):
    worker_id: Optional[int] = None
    period_start: datetime
    period_end: datetime

class WageRecordResponse(BaseModel):
    id: int
    worker_id: int
    worker_name: str
    employee_code: str
    department: str
    period_start: datetime
    period_end: datetime
    regular_wages: float
    overtime_wages: float
    total_wage: float
    is_paid: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
