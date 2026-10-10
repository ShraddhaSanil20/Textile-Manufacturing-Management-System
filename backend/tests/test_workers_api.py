import pytest
import uuid
from datetime import datetime, timezone, timedelta

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_workers_rbac_protection(client):
    """Test RBAC restrictions on workers and payroll."""
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    acc_token = get_auth_token(client, "accounts@everest.test", "Accounts@123")

    # Buyer cannot view workers
    res = client.get("/api/workers", headers={"Authorization": f"Bearer {buyer_token}"})
    assert res.status_code == 403

    # Accounts can view workers
    res_acc = client.get("/api/workers", headers={"Authorization": f"Bearer {acc_token}"})
    assert res_acc.status_code == 200

def test_worker_attendance_and_overtime_wage_calculation(client):
    """
    Test end-to-end workers and payroll calculation:
    1. Enroll worker with hourly wage $20.00.
    2. Log shift attendance: 8 hours regular, 10 hours (8 regular + 2 OT).
    3. Calculate wages: verify 16 hrs regular + 2 hrs overtime (at 1.5x rate).
    4. Verify disbursement (mark as paid).
    """
    acc_token = get_auth_token(client, "accounts@everest.test", "Accounts@123")
    headers = {"Authorization": f"Bearer {acc_token}"}

    # 1. Enroll worker
    emp_code = f"WRK-{uuid.uuid4().hex[:5].upper()}"
    worker_res = client.post("/api/workers", json={
        "full_name": "Ramesh Kumar Sharma",
        "employee_code": emp_code,
        "department": "weaving",
        "hourly_wage": 20.0
    }, headers=headers)
    assert worker_res.status_code == 201
    worker_id = worker_res.json()["id"]

    # 2. Log attendance
    today = datetime.now(timezone.utc)
    yesterday = today - timedelta(days=1)

    # Shift 1: Standard 8 hrs
    att1 = client.post("/api/workers/attendance", json={
        "worker_id": worker_id,
        "date": yesterday.isoformat(),
        "shift": "morning",
        "hours_worked": 8.0,
        "status": "present"
    }, headers=headers)
    assert att1.status_code == 201

    # Shift 2: Overtime 10 hrs (8 reg + 2 OT)
    att2 = client.post("/api/workers/attendance", json={
        "worker_id": worker_id,
        "date": today.isoformat(),
        "shift": "evening",
        "hours_worked": 10.0,
        "status": "present"
    }, headers=headers)
    assert att2.status_code == 201

    # 3. Calculate wages for the 2-day period
    calc_res = client.post("/api/workers/wages/calculate", json={
        "worker_id": worker_id,
        "period_start": (yesterday - timedelta(hours=2)).isoformat(),
        "period_end": (today + timedelta(hours=2)).isoformat()
    }, headers=headers)
    assert calc_res.status_code == 201
    wages = calc_res.json()
    assert len(wages) == 1
    wage_rec = wages[0]

    # Math: (8 + 8) * 20 = $320 regular. Overtime = 2 * (20 * 1.5) = $60. Total = $380.
    assert wage_rec["regular_wages"] == 320.0
    assert wage_rec["overtime_wages"] == 60.0
    assert wage_rec["total_wage"] == 380.0
    assert wage_rec["is_paid"] is False
    wage_id = wage_rec["id"]

    # 4. Mark paid
    pay_res = client.patch(f"/api/workers/wages/{wage_id}/pay", headers=headers)
    assert pay_res.status_code == 200
    assert pay_res.json()["is_paid"] is True
