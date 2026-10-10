import pytest
import uuid
from datetime import datetime, timezone, timedelta

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_dispatch_rbac_protection(client):
    """Test RBAC on dispatch endpoints."""
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    qi_token = get_auth_token(client, "quality@everest.test", "Quality@123")

    # Buyer cannot create dispatch
    res = client.post("/api/dispatch", json={
        "order_id": 1,
        "roll_ids": [1],
        "invoice_number": "INV-UNAUTH-01"
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert res.status_code == 403

    # Quality inspector cannot create dispatch
    res_qi = client.post("/api/dispatch", json={
        "order_id": 1,
        "roll_ids": [1],
        "invoice_number": "INV-UNAUTH-02"
    }, headers={"Authorization": f"Bearer {qi_token}"})
    assert res_qi.status_code == 403

def test_atomic_dispatch_pipeline_and_duplicate_prevention(client):
    """
    Test end-to-end dispatch:
    1. Create order for 200m.
    2. Produce 200m (2 rolls of 100m).
    3. Pass both rolls in quality inspection.
    4. Verify rolls appear in available finished goods.
    5. Dispatch Roll 1 -> verify status updated and finished goods deducted.
    6. Verify attempting to dispatch Roll 1 a second time is strictly rejected (no double-dispatch).
    7. Dispatch Roll 2 -> total ordered metres fulfilled -> order completed.
    8. Buyer views dispatch history.
    """
    admin_token = get_auth_token(client, "admin@everest.test", "Admin@123")
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    op_token = get_auth_token(client, "production@everest.test", "Prod@123")
    qi_token = get_auth_token(client, "quality@everest.test", "Quality@123")
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    store_headers = {"Authorization": f"Bearer {store_token}"}
    op_headers = {"Authorization": f"Bearer {op_token}"}
    qi_headers = {"Authorization": f"Bearer {qi_token}"}
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}

    # 1. Create order
    buyers_res = client.get("/api/orders/meta/buyers", headers=admin_headers)
    buyer_id = buyers_res.json()[0]["id"]
    order_res = client.post("/api/orders", json={
        "buyer_id": buyer_id,
        "fabric_type": "High-Grade Cotton Sheeting",
        "colour": "Optical White",
        "quantity_metres": 200.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        "unit_price": 6.00
    }, headers=admin_headers)
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # 2. Produce 200m on weaving machine
    mac_name = f"Weave-Disp-{uuid.uuid4().hex[:4]}"
    mac_res = client.post("/api/production/machines", json={
        "name": mac_name,
        "type": "weaving"
    }, headers=op_headers)
    machine_id = mac_res.json()["id"]

    batch_res = client.post("/api/production/batches", json={
        "order_id": order_id,
        "machine_id": machine_id,
        "stage": "weaving",
        "shift": "morning"
    }, headers=op_headers)
    batch_id = batch_res.json()["id"]

    client.post(f"/api/production/batches/{batch_id}/output", json={
        "output_metres": 200.0,
        "downtime_minutes": 0.0,
        "mark_completed": True
    }, headers=op_headers)

    # 3. Fetch rolls and pass both in quality check
    rolls = client.get(f"/api/quality/rolls?order_id={order_id}", headers=qi_headers).json()
    assert len(rolls) == 2
    roll1_id = rolls[0]["id"]
    roll2_id = rolls[1]["id"]

    for r_id in [roll1_id, roll2_id]:
        insp_res = client.post("/api/quality/inspections", json={
            "roll_id": r_id,
            "result": "passed",
            "defect_category": "none"
        }, headers=qi_headers)
        assert insp_res.status_code == 201

    # 4. Check available finished goods
    fg_res = client.get(f"/api/dispatch/finished-goods?order_id={order_id}", headers=store_headers)
    assert fg_res.status_code == 200
    available_fgs = fg_res.json()
    assert len(available_fgs) == 2

    # 5. Dispatch Roll 1
    inv1 = f"INV-{uuid.uuid4().hex[:6].upper()}"
    disp1_res = client.post("/api/dispatch", json={
        "order_id": order_id,
        "roll_ids": [roll1_id],
        "invoice_number": inv1
    }, headers=store_headers)
    assert disp1_res.status_code == 201
    disp1_data = disp1_res.json()
    assert disp1_data["total_metres"] == 100.0
    assert len(disp1_data["items"]) == 1

    # 6. Verify duplicate dispatch of Roll 1 is rejected with 400
    inv_dup = f"INV-{uuid.uuid4().hex[:6].upper()}"
    dup_res = client.post("/api/dispatch", json={
        "order_id": order_id,
        "roll_ids": [roll1_id],
        "invoice_number": inv_dup
    }, headers=store_headers)
    assert dup_res.status_code == 400
    assert "not in available finished goods" in dup_res.json()["detail"] or "already been dispatched" in dup_res.json()["detail"]

    # 7. Dispatch Roll 2 -> Fulfills all 200m of order -> completed!
    inv2 = f"INV-{uuid.uuid4().hex[:6].upper()}"
    disp2_res = client.post("/api/dispatch", json={
        "order_id": order_id,
        "roll_ids": [roll2_id],
        "invoice_number": inv2
    }, headers=store_headers)
    assert disp2_res.status_code == 201

    # Check order status is completed
    ord_check = client.get(f"/api/orders/{order_id}", headers=store_headers).json()
    assert ord_check["status"] == "completed"

    # 8. Check buyer can view dispatch history
    buyer_history = client.get("/api/dispatch/history", headers=buyer_headers)
    assert buyer_history.status_code == 200
    history = buyer_history.json()
    assert any(d["invoice_number"] == inv1 for d in history)
    assert any(d["invoice_number"] == inv2 for d in history)
