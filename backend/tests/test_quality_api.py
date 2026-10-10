import pytest
from datetime import datetime, timezone, timedelta
from app.models.quality import InspectionResult, DefectCategory

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_quality_rbac_protection(client):
    """Test that unauthorized roles cannot submit quality inspections."""
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    qi_token = get_auth_token(client, "quality@everest.test", "Quality@123")

    # Buyer attempting to inspect roll gets 403
    res = client.post("/api/quality/inspections", json={
        "roll_id": 9999,
        "result": "passed"
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert res.status_code == 403

    # Quality inspector gets 404 for non-existent roll rather than 403
    res_qi = client.post("/api/quality/inspections", json={
        "roll_id": 9999,
        "result": "passed"
    }, headers={"Authorization": f"Bearer {qi_token}"})
    assert res_qi.status_code == 404

def test_quality_inspection_flow_and_genealogy(client):
    """
    Test full quality cycle:
    1. Order + Production output generates FabricRolls.
    2. Quality inspector views roll genealogy (order, batch, machine).
    3. Pass one roll -> verify FinishedGood auto-enrolled as available.
    4. Reject another roll with 'stain' -> verify defect logged and FinishedGood not enrolled.
    5. Check quality statistics and defect breakdown.
    """
    admin_token = get_auth_token(client, "admin@everest.test", "Admin@123")
    op_token = get_auth_token(client, "production@everest.test", "Prod@123")
    qi_token = get_auth_token(client, "quality@everest.test", "Quality@123")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    op_headers = {"Authorization": f"Bearer {op_token}"}
    qi_headers = {"Authorization": f"Bearer {qi_token}"}

    # 1. Create order
    buyers_res = client.get("/api/orders/meta/buyers", headers=admin_headers)
    buyer_id = buyers_res.json()[0]["id"]
    order_res = client.post("/api/orders", json={
        "buyer_id": buyer_id,
        "fabric_type": "Test Quality Twill",
        "colour": "Steel Grey",
        "quantity_metres": 200.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "unit_price": 5.50
    }, headers=admin_headers)
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # 2. Create machine and batch
    import uuid
    mac_name = f"Weaver-Q-{uuid.uuid4().hex[:4]}"
    mac_res = client.post("/api/production/machines", json={
        "name": mac_name,
        "type": "weaving"
    }, headers=op_headers)
    assert mac_res.status_code == 201
    machine_id = mac_res.json()["id"]

    batch_res = client.post("/api/production/batches", json={
        "order_id": order_id,
        "machine_id": machine_id,
        "stage": "weaving",
        "shift": "morning"
    }, headers=op_headers)
    assert batch_res.status_code == 201
    batch_id = batch_res.json()["id"]

    # 3. Log 200m output (creates 2 rolls of 100m)
    out_res = client.post(f"/api/production/batches/{batch_id}/output", json={
        "output_metres": 200.0,
        "downtime_minutes": 10.0,
        "mark_completed": True
    }, headers=op_headers)
    assert out_res.status_code == 200
    assert out_res.json()["fabric_rolls_count"] == 2

    # 4. View rolls from quality endpoint
    rolls_res = client.get(f"/api/quality/rolls?order_id={order_id}", headers=qi_headers)
    assert rolls_res.status_code == 200
    rolls_data = rolls_res.json()
    assert len(rolls_data) == 2
    roll1_id = rolls_data[0]["id"]
    roll2_id = rolls_data[1]["id"]
    # Verify genealogy
    r1_info = next(r for r in rolls_data if r["id"] == roll1_id)
    assert r1_info["machine_name"] == mac_name
    assert r1_info["fabric_type"] == "Test Quality Twill"
    assert r1_info["inspection_status"] == "awaiting"

    # 5. Inspect Roll 1 -> PASSED
    insp1_res = client.post("/api/quality/inspections", json={
        "roll_id": roll1_id,
        "result": "passed",
        "defect_category": "none",
        "notes": "Premium quality, zero defects"
    }, headers=qi_headers)
    assert insp1_res.status_code == 201
    assert insp1_res.json()["result"] == "passed"

    # Check roll genealogy updated with FinishedGood available
    r1_updated = client.get(f"/api/quality/rolls/{roll1_id}", headers=qi_headers).json()
    assert r1_updated["inspection_status"] == "passed"
    assert r1_updated["finished_good_status"] == "available"

    # 6. Inspect Roll 2 -> REJECTED with stain defect
    insp2_res = client.post("/api/quality/inspections", json={
        "roll_id": roll2_id,
        "result": "rejected",
        "defect_category": "stain",
        "notes": "Oil stains found along selvedge"
    }, headers=qi_headers)
    assert insp2_res.status_code == 201
    assert insp2_res.json()["result"] == "rejected"
    assert insp2_res.json()["defect_category"] == "stain"

    r2_updated = client.get(f"/api/quality/rolls/{roll2_id}", headers=qi_headers).json()
    assert r2_updated["inspection_status"] == "rejected"
    assert r2_updated["finished_good_status"] is None

    # 7. Check stats
    stats_res = client.get("/api/quality/stats", headers=qi_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["passed_count"] >= 1
    assert stats["rejected_count"] >= 1
    assert stats["defect_breakdown"]["stain"] >= 1
