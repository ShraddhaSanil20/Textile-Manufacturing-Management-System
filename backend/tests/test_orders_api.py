import pytest
from datetime import datetime, timezone, timedelta

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_orders_creation_and_rbac(client):
    """Test customer order creation by store manager and buyer scoping."""
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")

    # 1. Get buyers list as store_manager
    buyers_res = client.get("/api/orders/meta/buyers", headers={"Authorization": f"Bearer {store_token}"})
    assert buyers_res.status_code == 200
    buyers = buyers_res.json()
    assert len(buyers) > 0
    buyer_id = buyers[0]["id"]

    # 2. Create order as store_manager
    order_payload = {
        "buyer_id": buyer_id,
        "fabric_type": "Royal Blue Cotton Poplin 40s",
        "colour": "Royal Blue",
        "quantity_metres": 1000.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=21)).isoformat(),
        "unit_price": 4.80
    }
    create_res = client.post("/api/orders", json=order_payload, headers={"Authorization": f"Bearer {store_token}"})
    assert create_res.status_code == 201
    order = create_res.json()
    order_id = order["id"]
    assert order["total_revenue"] == 4800.0
    assert order["status"] == "created"

    # 3. Buyer self-creates order
    buyer_order_res = client.post("/api/orders", json={
        "fabric_type": "Navy Denim 12oz",
        "colour": "Dark Navy",
        "quantity_metres": 500.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "unit_price": 6.50
    }, headers={"Authorization": f"Bearer {buyer_token}"})
    assert buyer_order_res.status_code == 201
    buyer_order = buyer_order_res.json()

    # 4. Verify buyer list scoping
    buyer_list_res = client.get("/api/orders", headers={"Authorization": f"Bearer {buyer_token}"})
    assert buyer_list_res.status_code == 200
    buyer_orders = buyer_list_res.json()
    assert all(o["buyer_id"] == buyer_order["buyer_id"] for o in buyer_orders)

    # 5. Verify store manager sees all orders
    store_list_res = client.get("/api/orders", headers={"Authorization": f"Bearer {store_token}"})
    assert store_list_res.status_code == 200
    assert len(store_list_res.json()) >= 2

def test_material_availability_check(client):
    """Test automated material availability check and shortage reporting."""
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    headers = {"Authorization": f"Bearer {store_token}"}

    import uuid
    test_colour = f"Gold-{uuid.uuid4().hex[:6]}"

    # 1. Create raw material with limited stock
    mat_res = client.post("/api/inventory/materials", json={
        "yarn_type": f"Silk 100D {test_colour}",
        "colour": test_colour,
        "quantity_on_hand": 50.0,  # 50 kg in stock
        "unit": "kg",
        "reorder_threshold": 100.0
    }, headers=headers)
    assert mat_res.status_code == 201

    buyers_res = client.get("/api/orders/meta/buyers", headers=headers)
    buyer_id = buyers_res.json()[0]["id"]

    # 2. Create order requiring 1000m (needs 250 kg yarn, but only 50 kg available -> shortage!)
    order_res = client.post("/api/orders", json={
        "buyer_id": buyer_id,
        "fabric_type": f"Satin {test_colour}",
        "colour": test_colour,
        "quantity_metres": 1000.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "unit_price": 12.00
    }, headers=headers)
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # 3. Trigger automated material check
    check_res = client.post(f"/api/orders/{order_id}/material-check", headers=headers)
    assert check_res.status_code == 200
    result = check_res.json()
    assert result["required_yarn_kg"] == 250.0
    assert result["sufficient"] is False
    assert result["shortage_kg"] == 200.0  # 250 required - 50 available
    assert "WARNING: Insufficient yarn!" in result["message"]

    # 4. Now receive 300 kg stock
    sup_res = client.get("/api/inventory/suppliers", headers=headers)
    sup_id = sup_res.json()[0]["id"] if sup_res.json() else None

    client.post("/api/inventory/movements", json={
        "material_id": mat_res.json()["id"],
        "movement_type": "received",
        "quantity": 300.0,
        "supplier_id": sup_id,
        "notes": "Emergency replenishment for Canary Gold order"
    }, headers=headers)

    # 5. Re-check: now should be sufficient!
    check_res2 = client.post(f"/api/orders/{order_id}/material-check", headers=headers)
    assert check_res2.status_code == 200
    result2 = check_res2.json()
    assert result2["sufficient"] is True
    assert result2["shortage_kg"] == 0.0
    assert result2["status_updated"] == "material_check"
