import pytest
from datetime import datetime, timezone, timedelta

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_machine_fleet_and_batch_execution(client):
    """Test machine registration, assigning order to stage batch, and recording shift output."""
    prod_token = get_auth_token(client, "production@everest.test", "Prod@123")
    headers = {"Authorization": f"Bearer {prod_token}"}

    # 1. Register a new weaving loom
    loom_res = client.post("/api/production/machines", json={
        "name": f"Air-Jet Loom AJ-{int(datetime.now().timestamp())}",
        "type": "weaving",
        "status": "idle"
    }, headers=headers)
    assert loom_res.status_code == 201
    machine_id = loom_res.json()["id"]

    # 2. Get active order
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    orders_res = client.get("/api/orders", headers={"Authorization": f"Bearer {store_token}"})
    assert orders_res.status_code == 200
    order_id = orders_res.json()[0]["id"]

    # 3. Create a production batch on weaving loom
    batch_res = client.post("/api/production/batches", json={
        "order_id": order_id,
        "stage": "weaving",
        "machine_id": machine_id,
        "shift": "morning",
        "output_metres": 0.0,
        "downtime_minutes": 0
    }, headers=headers)
    assert batch_res.status_code == 201
    batch = batch_res.json()
    batch_id = batch["id"]

    # Verify machine is now running
    machines_res = client.get("/api/production/machines", headers=headers)
    m = next(m for m in machines_res.json() if m["id"] == machine_id)
    assert m["status"] == "running"
    assert m["active_batch_number"] == batch["batch_number"]

    # 4. Record shift output of 200m and 20 min downtime, complete batch
    output_res = client.post(f"/api/production/batches/{batch_id}/output", json={
        "output_metres": 200.0,
        "downtime_minutes": 20,
        "create_fabric_rolls": True,
        "mark_completed": True
    }, headers=headers)
    assert output_res.status_code == 200
    updated_batch = output_res.json()
    assert updated_batch["output_metres"] == 200.0
    assert updated_batch["downtime_minutes"] == 20
    assert updated_batch["status"] == "completed"
    assert updated_batch["fabric_rolls_count"] >= 2  # 200m created two 100m rolls

    # Verify machine transitioned back to idle
    machines_res2 = client.get("/api/production/machines", headers=headers)
    m2 = next(m for m in machines_res2.json() if m["id"] == machine_id)
    assert m2["status"] == "idle"

def test_delayed_orders_monitoring(client):
    """Test delayed orders endpoint."""
    prod_token = get_auth_token(client, "production@everest.test", "Prod@123")
    headers = {"Authorization": f"Bearer {prod_token}"}

    delayed_res = client.get("/api/production/delayed-orders", headers=headers)
    assert delayed_res.status_code == 200
    assert isinstance(delayed_res.json(), list)
