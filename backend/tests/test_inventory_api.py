import pytest

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_inventory_rbac_protection(client):
    """Test that buyer cannot access inventory endpoints (403), but store_manager can."""
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    res_buyer = client.get("/api/inventory/materials", headers={"Authorization": f"Bearer {buyer_token}"})
    assert res_buyer.status_code == 403

    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    res_store = client.get("/api/inventory/materials", headers={"Authorization": f"Bearer {store_token}"})
    assert res_store.status_code == 200

def test_create_material_and_record_stock_movements(client):
    """Test registering material, receiving stock, and consuming stock."""
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    headers = {"Authorization": f"Bearer {store_token}"}

    # 1. Create supplier
    sup_res = client.post("/api/inventory/suppliers", json={
        "name": "Reliance Synthetics Ltd",
        "contact_person": "Vikram Patel",
        "phone": "+91-9876500000",
        "email": "vikram@reliance.test",
        "address": "Surat, Gujarat"
    }, headers=headers)
    assert sup_res.status_code == 201
    supplier_id = sup_res.json()["id"]

    # 2. Create raw material
    mat_res = client.post("/api/inventory/materials", json={
        "yarn_type": "Polyester Microfiber 75D",
        "colour": "Navy Blue #02",
        "quantity_on_hand": 100.0,
        "unit": "kg",
        "reorder_threshold": 200.0
    }, headers=headers)
    assert mat_res.status_code == 201
    material = mat_res.json()
    material_id = material["id"]
    assert material["is_low_stock"] is True  # 100 <= 200 threshold

    # 3. Receive 250 kg stock
    rec_res = client.post("/api/inventory/movements", json={
        "material_id": material_id,
        "movement_type": "received",
        "quantity": 250.0,
        "supplier_id": supplier_id,
        "notes": "Truck batch delivery TRK-882"
    }, headers=headers)
    assert rec_res.status_code == 201

    # Check updated balance
    mats_res = client.get("/api/inventory/materials", headers=headers)
    updated = next(m for m in mats_res.json() if m["id"] == material_id)
    assert updated["quantity_on_hand"] == 350.0
    assert updated["is_low_stock"] is False  # 350 > 200 threshold

    # 4. Consume 150 kg stock
    cons_res = client.post("/api/inventory/movements", json={
        "material_id": material_id,
        "movement_type": "consumed",
        "quantity": 150.0,
        "notes": "Issued to Weaving Loom SF-01"
    }, headers=headers)
    assert cons_res.status_code == 201

    mats_res2 = client.get("/api/inventory/materials", headers=headers)
    updated2 = next(m for m in mats_res2.json() if m["id"] == material_id)
    assert updated2["quantity_on_hand"] == 200.0
    assert updated2["is_low_stock"] is True  # 200 <= 200 threshold

def test_prevent_negative_inventory_consumption(client):
    """Test that attempting to consume more than available stock raises 400 Bad Request."""
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    headers = {"Authorization": f"Bearer {store_token}"}

    mat_res = client.post("/api/inventory/materials", json={
        "yarn_type": "Linen Slub 20s",
        "colour": "Natural Ecru",
        "quantity_on_hand": 50.0,
        "unit": "kg",
        "reorder_threshold": 100.0
    }, headers=headers)
    assert mat_res.status_code == 201
    material_id = mat_res.json()["id"]

    # Attempt to consume 80 kg (only 50 kg available)
    fail_res = client.post("/api/inventory/movements", json={
        "material_id": material_id,
        "movement_type": "consumed",
        "quantity": 80.0,
        "notes": "Attempting over-consumption"
    }, headers=headers)
    assert fail_res.status_code == 400
    assert "Insufficient stock on hand" in fail_res.json()["detail"]

def test_inventory_alerts_endpoint(client):
    """Test that low stock alerts endpoint returns materials at or below reorder threshold."""
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    headers = {"Authorization": f"Bearer {store_token}"}

    alerts_res = client.get("/api/inventory/alerts", headers=headers)
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert isinstance(alerts, list)
    for alert in alerts:
        assert alert["quantity_on_hand"] <= alert["reorder_threshold"]
        assert alert["shortfall"] >= 0
