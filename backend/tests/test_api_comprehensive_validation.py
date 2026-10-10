import pytest
import uuid
from datetime import datetime, timezone, timedelta

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


# ==============================================================================
# 1. USERS & STAFF MANAGEMENT API
# ==============================================================================

def test_users_api_admin_crud_and_validations(client):
    admin_token = get_auth_token(client, "admin@everest.test", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    store_headers = {"Authorization": f"Bearer {store_token}"}
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}

    # 1. Unauthenticated request to /api/users returns 401
    res_unauth = client.get("/api/users")
    assert res_unauth.status_code == 401

    # 2. Non-admin attempting to list users returns 403
    res_forbidden = client.get("/api/users", headers=store_headers)
    assert res_forbidden.status_code == 403
    res_buyer = client.get("/api/users", headers=buyer_headers)
    assert res_buyer.status_code == 403

    # 3. Admin lists users successfully (200)
    res_list = client.get("/api/users", headers=admin_headers)
    assert res_list.status_code == 200
    assert isinstance(res_list.json(), list)
    assert len(res_list.json()) >= 6

    # 4. Admin creates new staff user successfully (201)
    unique_suffix = uuid.uuid4().hex[:6]
    new_email = f"staff_{unique_suffix}@everest.test"
    create_res = client.post("/api/users", json={
        "full_name": f"Test Staff {unique_suffix}",
        "email": new_email,
        "password": "Password@123",
        "role": "quality_inspector"
    }, headers=admin_headers)
    assert create_res.status_code == 201
    user_data = create_res.json()
    assert user_data["email"] == new_email
    assert user_data["role"] == "quality_inspector"
    assert "hashed_password" not in user_data

    # 5. Duplicate email creation rejected (400)
    dup_res = client.post("/api/users", json={
        "full_name": "Duplicate Staff",
        "email": new_email,
        "password": "Password@123",
        "role": "production_operator"
    }, headers=admin_headers)
    assert dup_res.status_code == 400
    assert "already registered" in dup_res.json()["detail"]

    # 6. Invalid email format rejected (422)
    invalid_email_res = client.post("/api/users", json={
        "full_name": "Bad Email Staff",
        "email": "not-an-email",
        "password": "Password@123",
        "role": "store_manager"
    }, headers=admin_headers)
    assert invalid_email_res.status_code == 422

    # 7. Missing required fields rejected (422)
    missing_fields_res = client.post("/api/users", json={
        "email": f"missing_{unique_suffix}@everest.test"
    }, headers=admin_headers)
    assert missing_fields_res.status_code == 422

    # 8. Non-admin attempting to create staff user returns 403
    store_create = client.post("/api/users", json={
        "full_name": "Unauthorized Staff",
        "email": f"unauth_{unique_suffix}@everest.test",
        "password": "Password@123",
        "role": "buyer"
    }, headers=store_headers)
    assert store_create.status_code == 403


# ==============================================================================
# 2. INVENTORY & RAW MATERIALS API
# ==============================================================================

def test_inventory_api_validations_and_error_handling(client):
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    store_headers = {"Authorization": f"Bearer {store_token}"}
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}

    # 1. Unauthenticated access returns 401
    assert client.get("/api/inventory/materials").status_code == 401
    assert client.get("/api/inventory/suppliers").status_code == 401
    assert client.get("/api/inventory/movements").status_code == 401
    assert client.get("/api/inventory/alerts").status_code == 401

    # 2. Buyer access returns 403
    assert client.get("/api/inventory/materials", headers=buyer_headers).status_code == 403
    assert client.get("/api/inventory/suppliers", headers=buyer_headers).status_code == 403

    # 3. Create raw material with missing fields returns 422
    missing_mat = client.post("/api/inventory/materials", json={
        "unit": "kg"
    }, headers=store_headers)
    assert missing_mat.status_code == 422

    # 4. Create raw material with negative quantity_on_hand returns 422
    neg_qty_mat = client.post("/api/inventory/materials", json={
        "yarn_type": "Invalid Yarn",
        "colour": "Red",
        "quantity_on_hand": -25.0,
        "unit": "kg"
    }, headers=store_headers)
    assert neg_qty_mat.status_code == 422

    # 5. Create raw material with negative reorder_threshold returns 422
    neg_reorder_mat = client.post("/api/inventory/materials", json={
        "yarn_type": "Invalid Yarn",
        "colour": "Blue",
        "quantity_on_hand": 10.0,
        "reorder_threshold": -10.0
    }, headers=store_headers)
    assert neg_reorder_mat.status_code == 422

    # 6. Create supplier with missing required fields returns 422
    missing_sup = client.post("/api/inventory/suppliers", json={}, headers=store_headers)
    assert missing_sup.status_code == 422

    # 7. Stock movement on non-existent material ID returns 404
    mov_404 = client.post("/api/inventory/movements", json={
        "material_id": 999999,
        "movement_type": "received",
        "quantity": 100.0
    }, headers=store_headers)
    assert mov_404.status_code == 404
    assert "not found" in mov_404.json()["detail"].lower()

    # 8. Stock movement with non-positive quantity returns 422
    mov_zero = client.post("/api/inventory/movements", json={
        "material_id": 1,
        "movement_type": "received",
        "quantity": 0.0
    }, headers=store_headers)
    assert mov_zero.status_code == 422

    mov_neg = client.post("/api/inventory/movements", json={
        "material_id": 1,
        "movement_type": "received",
        "quantity": -50.0
    }, headers=store_headers)
    assert mov_neg.status_code == 422

    # 9. Stock movement with invalid movement_type returns 422
    mov_bad_type = client.post("/api/inventory/movements", json={
        "material_id": 1,
        "movement_type": "stolen",
        "quantity": 10.0
    }, headers=store_headers)
    assert mov_bad_type.status_code == 422

    # 10. Stock movement with non-existent supplier ID returns 404
    # First create a valid material
    mat_res = client.post("/api/inventory/materials", json={
        "yarn_type": f"Test Cotton {uuid.uuid4().hex[:4]}",
        "colour": "Ecru",
        "quantity_on_hand": 100.0,
        "reorder_threshold": 50.0
    }, headers=store_headers)
    assert mat_res.status_code == 201
    mat_id = mat_res.json()["id"]

    mov_bad_sup = client.post("/api/inventory/movements", json={
        "material_id": mat_id,
        "movement_type": "received",
        "quantity": 50.0,
        "supplier_id": 999999
    }, headers=store_headers)
    assert mov_bad_sup.status_code == 404
    assert "supplier" in mov_bad_sup.json()["detail"].lower()


# ==============================================================================
# 3. CUSTOMER ORDERS API
# ==============================================================================

def test_orders_api_validations_and_lifecycle_controls(client):
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    store_headers = {"Authorization": f"Bearer {store_token}"}
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    op_token = get_auth_token(client, "production@everest.test", "Prod@123")
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # 1. Unauthenticated order requests return 401
    assert client.get("/api/orders").status_code == 401
    assert client.get("/api/orders/meta/buyers").status_code == 401
    assert client.post("/api/orders", json={}).status_code == 401

    # 2. Operator unauthorized to view orders (403)
    assert client.get("/api/orders", headers=op_headers).status_code == 403

    # 3. Create order with missing required fields returns 422
    missing_ord = client.post("/api/orders", json={
        "quantity_metres": 100.0
    }, headers=store_headers)
    assert missing_ord.status_code == 422

    # 4. Create order with non-positive metres returns 422
    zero_m_ord = client.post("/api/orders", json={
        "fabric_type": "Cotton Twill",
        "colour": "Khaki",
        "quantity_metres": 0.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "unit_price": 5.0
    }, headers=buyer_headers)
    assert zero_m_ord.status_code == 422

    neg_m_ord = client.post("/api/orders", json={
        "fabric_type": "Cotton Twill",
        "colour": "Khaki",
        "quantity_metres": -100.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "unit_price": 5.0
    }, headers=buyer_headers)
    assert neg_m_ord.status_code == 422

    # 5. Create order with negative unit price returns 422
    neg_price_ord = client.post("/api/orders", json={
        "fabric_type": "Cotton Twill",
        "colour": "Khaki",
        "quantity_metres": 100.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "unit_price": -5.0
    }, headers=buyer_headers)
    assert neg_price_ord.status_code == 422

    # 6. Staff creating order without buyer_id returns 400
    staff_no_buyer = client.post("/api/orders", json={
        "fabric_type": "Cotton Twill",
        "colour": "Khaki",
        "quantity_metres": 100.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "unit_price": 5.0
    }, headers=store_headers)
    assert staff_no_buyer.status_code == 400
    assert "buyer_id is required" in staff_no_buyer.json()["detail"]

    # 7. Staff creating order with non-existent buyer_id returns 404
    staff_bad_buyer = client.post("/api/orders", json={
        "buyer_id": 999999,
        "fabric_type": "Cotton Twill",
        "colour": "Khaki",
        "quantity_metres": 100.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "unit_price": 5.0
    }, headers=store_headers)
    assert staff_bad_buyer.status_code == 404
    assert "buyer" in staff_bad_buyer.json()["detail"].lower()

    # 8. Get non-existent order ID returns 404
    assert client.get("/api/orders/999999", headers=store_headers).status_code == 404

    # 9. Material check on non-existent order ID returns 404
    assert client.post("/api/orders/999999/material-check", headers=store_headers).status_code == 404

    # 10. Update status on non-existent order ID returns 404
    status_404 = client.patch("/api/orders/999999/status", json={"status": "in_production"}, headers=store_headers)
    assert status_404.status_code == 404

    # 11. Update status with invalid enum returns 422
    status_bad_enum = client.patch("/api/orders/1/status", json={"status": "flying"}, headers=store_headers)
    assert status_bad_enum.status_code == 422

    # 12. Buyer attempting to update order status returns 403
    status_buyer = client.patch("/api/orders/1/status", json={"status": "completed"}, headers=buyer_headers)
    assert status_buyer.status_code == 403


# ==============================================================================
# 4. PRODUCTION FLEET & BATCHES API
# ==============================================================================

def test_production_fleet_and_batches_validations(client):
    op_token = get_auth_token(client, "production@everest.test", "Prod@123")
    op_headers = {"Authorization": f"Bearer {op_token}"}
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    store_headers = {"Authorization": f"Bearer {store_token}"}

    # 1. Buyer unauthorized to access machines or batches (403)
    assert client.get("/api/production/machines", headers=buyer_headers).status_code == 403
    assert client.get("/api/production/batches", headers=buyer_headers).status_code == 403
    assert client.post("/api/production/machines", json={}, headers=buyer_headers).status_code == 403

    # 2. Store manager cannot create machines (only admin and production_operator)
    store_create_mac = client.post("/api/production/machines", json={
        "name": "Unauthorized Loom",
        "type": "weaving"
    }, headers=store_headers)
    assert store_create_mac.status_code == 403

    # 3. Create machine with duplicate name returns 400
    mac_name = f"Loom-Dup-{uuid.uuid4().hex[:4]}"
    first_mac = client.post("/api/production/machines", json={
        "name": mac_name,
        "type": "weaving",
        "status": "idle"
    }, headers=op_headers)
    assert first_mac.status_code == 201
    machine_id = first_mac.json()["id"]

    dup_mac = client.post("/api/production/machines", json={
        "name": mac_name,
        "type": "spinning",
        "status": "idle"
    }, headers=op_headers)
    assert dup_mac.status_code == 400
    assert "already exists" in dup_mac.json()["detail"].lower()

    # 4. Create machine with missing name / type returns 422
    assert client.post("/api/production/machines", json={"type": "weaving"}, headers=op_headers).status_code == 422
    assert client.post("/api/production/machines", json={"name": "No Type"}, headers=op_headers).status_code == 422

    # 5. Create machine with invalid type returns 422
    assert client.post("/api/production/machines", json={"name": "Bad Type", "type": "rocket"}, headers=op_headers).status_code == 422

    # 6. Update status of non-existent machine returns 404
    assert client.patch("/api/production/machines/999999/status", json={"status": "idle"}, headers=op_headers).status_code == 404

    # 7. Update status with invalid status enum returns 422
    assert client.patch(f"/api/production/machines/{machine_id}/status", json={"status": "broken"}, headers=op_headers).status_code == 422

    # 8. Create batch for non-existent order returns 404
    batch_no_ord = client.post("/api/production/batches", json={
        "order_id": 999999,
        "stage": "spinning",
        "machine_id": machine_id
    }, headers=op_headers)
    assert batch_no_ord.status_code == 404
    assert "order" in batch_no_ord.json()["detail"].lower()

    # 9. Create batch for non-existent machine returns 404
    # Create valid order
    buyers = client.get("/api/orders/meta/buyers", headers=store_headers).json()
    order_res = client.post("/api/orders", json={
        "buyer_id": buyers[0]["id"],
        "fabric_type": "Test Batch Denim",
        "colour": "Indigo",
        "quantity_metres": 500.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        "unit_price": 5.0
    }, headers=store_headers)
    assert order_res.status_code == 201
    valid_order_id = order_res.json()["id"]

    batch_no_mac = client.post("/api/production/batches", json={
        "order_id": valid_order_id,
        "stage": "weaving",
        "machine_id": 999999
    }, headers=op_headers)
    assert batch_no_mac.status_code == 404
    assert "machine" in batch_no_mac.json()["detail"].lower()

    # 10. Create batch with invalid stage enum returns 422
    assert client.post("/api/production/batches", json={
        "order_id": valid_order_id,
        "stage": "ironing",
        "machine_id": machine_id
    }, headers=op_headers).status_code == 422

    # 11. Record output on non-existent batch ID returns 404
    assert client.post("/api/production/batches/999999/output", json={"output_metres": 100.0}, headers=op_headers).status_code == 404

    # 12. Record output with non-positive metres returns 422
    assert client.post(f"/api/production/batches/1/output", json={"output_metres": 0.0}, headers=op_headers).status_code == 422
    assert client.post(f"/api/production/batches/1/output", json={"output_metres": -50.0}, headers=op_headers).status_code == 422

    # 13. Record output with negative downtime returns 422
    assert client.post(f"/api/production/batches/1/output", json={"output_metres": 50.0, "downtime_minutes": -15}, headers=op_headers).status_code == 422


# ==============================================================================
# 5. QUALITY CONTROL API
# ==============================================================================

def test_quality_control_validations_and_filters(client):
    qi_token = get_auth_token(client, "quality@everest.test", "Quality@123")
    qi_headers = {"Authorization": f"Bearer {qi_token}"}
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    op_token = get_auth_token(client, "production@everest.test", "Prod@123")
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # 1. Buyer access returns 403
    assert client.get("/api/quality/rolls", headers=buyer_headers).status_code == 403
    assert client.get("/api/quality/rolls/1", headers=buyer_headers).status_code == 403
    assert client.get("/api/quality/inspections", headers=buyer_headers).status_code == 403
    assert client.get("/api/quality/stats", headers=buyer_headers).status_code == 403

    # 2. Operator cannot perform inspection (only admin and quality_inspector)
    assert client.post("/api/quality/inspections", json={"roll_id": 1, "result": "passed"}, headers=op_headers).status_code == 403

    # 3. Get roll details for non-existent roll returns 404
    assert client.get("/api/quality/rolls/999999", headers=qi_headers).status_code == 404

    # 4. Inspect non-existent roll returns 404
    assert client.post("/api/quality/inspections", json={"roll_id": 999999, "result": "passed"}, headers=qi_headers).status_code == 404

    # 5. Inspection with missing required fields returns 422
    assert client.post("/api/quality/inspections", json={"roll_id": 1}, headers=qi_headers).status_code == 422
    assert client.post("/api/quality/inspections", json={"result": "passed"}, headers=qi_headers).status_code == 422

    # 6. Inspection with invalid result enum returns 422
    assert client.post("/api/quality/inspections", json={"roll_id": 1, "result": "outstanding"}, headers=qi_headers).status_code == 422

    # 7. Inspection with invalid defect_category enum returns 422
    assert client.post("/api/quality/inspections", json={"roll_id": 1, "result": "rejected", "defect_category": "magic_dust"}, headers=qi_headers).status_code == 422

    # 8. Filter rolls by status query parameter returns 200
    rolls_filter = client.get("/api/quality/rolls?status=pending", headers=qi_headers)
    assert rolls_filter.status_code == 200
    assert isinstance(rolls_filter.json(), list)

    rolls_passed = client.get("/api/quality/rolls?status=passed", headers=qi_headers)
    assert rolls_passed.status_code == 200
    assert all(r["inspection_status"] == "passed" for r in rolls_passed.json())


# ==============================================================================
# 6. FINISHED GOODS & DISPATCH API
# ==============================================================================

def test_dispatch_api_validations_and_integrity(client):
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    store_headers = {"Authorization": f"Bearer {store_token}"}
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    op_token = get_auth_token(client, "production@everest.test", "Prod@123")
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # 1. Unauthenticated request returns 401
    assert client.get("/api/dispatch/finished-goods").status_code == 401
    assert client.get("/api/dispatch/history").status_code == 401
    assert client.post("/api/dispatch", json={}).status_code == 401

    # 2. Operator cannot access finished goods or dispatch history (403)
    assert client.get("/api/dispatch/finished-goods", headers=op_headers).status_code == 403
    assert client.get("/api/dispatch/history", headers=op_headers).status_code == 403

    # 3. Create dispatch for non-existent order returns 404
    disp_no_ord = client.post("/api/dispatch", json={
        "order_id": 999999,
        "roll_ids": [1],
        "invoice_number": f"INV-{uuid.uuid4().hex[:6]}"
    }, headers=store_headers)
    assert disp_no_ord.status_code == 404
    assert "order" in disp_no_ord.json()["detail"].lower()

    # 4. Create dispatch with non-existent roll ID returns 404
    orders = client.get("/api/orders", headers=store_headers).json()
    valid_order_id = orders[0]["id"]
    disp_bad_roll = client.post("/api/dispatch", json={
        "order_id": valid_order_id,
        "roll_ids": [999999],
        "invoice_number": f"INV-{uuid.uuid4().hex[:6]}"
    }, headers=store_headers)
    assert disp_bad_roll.status_code == 404
    assert "roll" in disp_bad_roll.json()["detail"].lower()

    # 5. Create dispatch with empty rolls list returns 422
    disp_empty = client.post("/api/dispatch", json={
        "order_id": valid_order_id,
        "roll_ids": [],
        "invoice_number": f"INV-{uuid.uuid4().hex[:6]}"
    }, headers=store_headers)
    assert disp_empty.status_code == 422

    # 6. Create dispatch with duplicate roll IDs in request returns 400
    disp_dup_rolls = client.post("/api/dispatch", json={
        "order_id": valid_order_id,
        "roll_ids": [1, 1],
        "invoice_number": f"INV-{uuid.uuid4().hex[:6]}"
    }, headers=store_headers)
    assert disp_dup_rolls.status_code == 400
    assert "duplicate roll ids" in disp_dup_rolls.json()["detail"].lower()

    # 7. Create dispatch with missing invoice_number returns 422
    assert client.post("/api/dispatch", json={"order_id": valid_order_id, "roll_ids": [1]}, headers=store_headers).status_code == 422


# ==============================================================================
# 7. WORKERS & PAYROLL API
# ==============================================================================

def test_workers_and_wages_validations_and_errors(client):
    acc_token = get_auth_token(client, "accounts@everest.test", "Accounts@123")
    acc_headers = {"Authorization": f"Bearer {acc_token}"}
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    op_token = get_auth_token(client, "production@everest.test", "Prod@123")
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # 1. Buyer cannot access workers, attendance, or wages (403)
    assert client.get("/api/workers", headers=buyer_headers).status_code == 403
    assert client.get("/api/workers/attendance", headers=buyer_headers).status_code == 403
    assert client.get("/api/workers/wages", headers=buyer_headers).status_code == 403

    # 2. Operator cannot create workers or calculate wages (403)
    assert client.post("/api/workers", json={}, headers=op_headers).status_code == 403
    assert client.post("/api/workers/wages/calculate", json={}, headers=op_headers).status_code == 403
    assert client.patch("/api/workers/wages/1/pay", headers=op_headers).status_code == 403

    # 3. Create worker with duplicate employee_code returns 400
    code = f"WRK-DUP-{uuid.uuid4().hex[:4].upper()}"
    first_worker = client.post("/api/workers", json={
        "full_name": "Deepak Patel",
        "employee_code": code,
        "department": "spinning",
        "hourly_wage": 18.50
    }, headers=acc_headers)
    assert first_worker.status_code == 201
    worker_id = first_worker.json()["id"]

    dup_worker = client.post("/api/workers", json={
        "full_name": "Another Deepak",
        "employee_code": code,
        "department": "dyeing",
        "hourly_wage": 19.00
    }, headers=acc_headers)
    assert dup_worker.status_code == 400
    assert "already exists" in dup_worker.json()["detail"].lower()

    # 4. Create worker with missing required fields returns 422
    assert client.post("/api/workers", json={"full_name": "No Code"}, headers=acc_headers).status_code == 422

    # 5. Create worker with negative hourly wage returns 422
    neg_wage = client.post("/api/workers", json={
        "full_name": "Negative Wage",
        "employee_code": f"WRK-{uuid.uuid4().hex[:4].upper()}",
        "department": "spinning",
        "hourly_wage": -15.0
    }, headers=acc_headers)
    assert neg_wage.status_code == 422

    # 6. Log attendance for non-existent worker returns 404
    att_404 = client.post("/api/workers/attendance", json={
        "worker_id": 999999,
        "date": datetime.now(timezone.utc).isoformat(),
        "shift": "morning",
        "hours_worked": 8.0,
        "status": "present"
    }, headers=acc_headers)
    assert att_404.status_code == 404

    # 7. Log attendance with negative hours returns 422
    att_neg_hrs = client.post("/api/workers/attendance", json={
        "worker_id": worker_id,
        "date": datetime.now(timezone.utc).isoformat(),
        "shift": "morning",
        "hours_worked": -4.0,
        "status": "present"
    }, headers=acc_headers)
    assert att_neg_hrs.status_code == 422

    # 8. Log attendance with invalid status returns 422
    att_bad_status = client.post("/api/workers/attendance", json={
        "worker_id": worker_id,
        "date": datetime.now(timezone.utc).isoformat(),
        "shift": "morning",
        "hours_worked": 8.0,
        "status": "holiday"
    }, headers=acc_headers)
    assert att_bad_status.status_code == 422

    # 9. Calculate wages with invalid date order (start > end) returns 400
    calc_inverted_dates = client.post("/api/workers/wages/calculate", json={
        "period_start": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        "period_end": datetime.now(timezone.utc).isoformat()
    }, headers=acc_headers)
    assert calc_inverted_dates.status_code == 400
    assert "period_start must be before" in calc_inverted_dates.json()["detail"].lower()

    # 10. Calculate wages for non-existent worker returns 404
    calc_bad_worker = client.post("/api/workers/wages/calculate", json={
        "worker_id": 999999,
        "period_start": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "period_end": datetime.now(timezone.utc).isoformat()
    }, headers=acc_headers)
    assert calc_bad_worker.status_code == 404

    # 11. Mark non-existent wage record as paid returns 404
    assert client.patch("/api/workers/wages/999999/pay", headers=acc_headers).status_code == 404


# ==============================================================================
# 8. COSTS & FINANCE API
# ==============================================================================

def test_finance_api_validations_and_error_handling(client):
    acc_token = get_auth_token(client, "accounts@everest.test", "Accounts@123")
    acc_headers = {"Authorization": f"Bearer {acc_token}"}
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    store_headers = {"Authorization": f"Bearer {store_token}"}

    # 1. Buyer access returns 403
    assert client.get("/api/finance/order-summaries", headers=buyer_headers).status_code == 403
    assert client.get("/api/finance/expenses", headers=buyer_headers).status_code == 403
    assert client.get("/api/finance/payments", headers=buyer_headers).status_code == 403
    assert client.post("/api/finance/expenses", json={}, headers=buyer_headers).status_code == 403
    assert client.post("/api/finance/payments", json={}, headers=buyer_headers).status_code == 403

    # 2. Record expense for non-existent order returns 404
    exp_404 = client.post("/api/finance/expenses", json={
        "order_id": 999999,
        "category": "dye_chemicals",
        "amount": 250.0
    }, headers=acc_headers)
    assert exp_404.status_code == 404
    assert "order" in exp_404.json()["detail"].lower()

    # 3. Record expense with non-positive amount returns 422
    assert client.post("/api/finance/expenses", json={"category": "dye_chemicals", "amount": 0.0}, headers=acc_headers).status_code == 422
    assert client.post("/api/finance/expenses", json={"category": "dye_chemicals", "amount": -100.0}, headers=acc_headers).status_code == 422

    # 4. Record expense with invalid category returns 422
    assert client.post("/api/finance/expenses", json={"category": "crypto_trading", "amount": 100.0}, headers=acc_headers).status_code == 422

    # 5. Record payment for non-existent order returns 404
    pay_404 = client.post("/api/finance/payments", json={
        "order_id": 999999,
        "amount": 500.0
    }, headers=acc_headers)
    assert pay_404.status_code == 404
    assert "order" in pay_404.json()["detail"].lower()

    # 6. Record payment with non-existent buyer returns 404
    orders = client.get("/api/orders", headers=store_headers).json()
    valid_order_id = orders[0]["id"]
    pay_bad_buyer = client.post("/api/finance/payments", json={
        "order_id": valid_order_id,
        "buyer_id": 999999,
        "amount": 500.0
    }, headers=acc_headers)
    assert pay_bad_buyer.status_code == 404

    # 7. Record payment with non-positive amount returns 422
    assert client.post("/api/finance/payments", json={"order_id": valid_order_id, "amount": 0.0}, headers=acc_headers).status_code == 422
    assert client.post("/api/finance/payments", json={"order_id": valid_order_id, "amount": -200.0}, headers=acc_headers).status_code == 422

    # 8. Record payment with invalid payment method returns 422
    assert client.post("/api/finance/payments", json={"order_id": valid_order_id, "amount": 100.0, "payment_method": "bitcoin"}, headers=acc_headers).status_code == 422


# ==============================================================================
# 9. EXECUTIVE DASHBOARD & JWT AUTH
# ==============================================================================

def test_dashboard_and_jwt_auth_scenarios(client):
    admin_token = get_auth_token(client, "admin@everest.test", "Admin@123")
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    op_token = get_auth_token(client, "production@everest.test", "Prod@123")
    acc_token = get_auth_token(client, "accounts@everest.test", "Accounts@123")
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")

    # 1. Unauthenticated request to /api/dashboard/stats returns 401
    assert client.get("/api/dashboard/stats").status_code == 401

    # 2. Malformed token returns 401
    assert client.get("/api/dashboard/stats", headers={"Authorization": "Bearer not-a-valid-jwt"}).status_code == 401

    # 3. Buyer role returns 403
    assert client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {buyer_token}"}).status_code == 403

    # 4. Authorized staff roles receive 200
    for tok in [admin_token, store_token, op_token, acc_token]:
        res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {tok}"})
        assert res.status_code == 200
        data = res.json()
        assert "machine_fleet" in data
        assert "quality" in data
        assert "finance" in data


# ==============================================================================
# 10. END-TO-END OPERATIONAL RELATIONSHIPS AND PIPELINE INTEGRATION
# ==============================================================================

def test_full_operational_data_relationships_pipeline(client):
    """
    Test full business integration across DB relationships:
    1. Register raw material (150 kg yarn).
    2. Create customer order for 200m fabric ($7.50/m = $1,500 total).
    3. Verify automated material availability check confirms yarn on hand.
    4. Register machine and dispatch batch for weaving.
    5. Record 200m production output -> generates two serialized 100m fabric rolls.
    6. Quality inspection:
       - Roll 1 passes -> automatically creates finished_good record in 'available' status.
       - Roll 2 re-inspected: first passed, then re-inspected as rework -> finished_good removed.
    7. Dispatch:
       - Dispatch Roll 1 with unique invoice -> finished_good becomes 'dispatched', order status updated.
    8. Finance:
       - Log order expense ($120 for warp sizing).
       - Record customer payment ($1,000 via bank transfer).
       - Check order cost summary: revenue $1500, est yarn cost $175 (200 * 0.25 * 3.50), expense $120, gross profit $1205.
    """
    admin_token = get_auth_token(client, "admin@everest.test", "Admin@123")
    store_token = get_auth_token(client, "store@everest.test", "Store@123")
    op_token = get_auth_token(client, "production@everest.test", "Prod@123")
    qi_token = get_auth_token(client, "quality@everest.test", "Quality@123")
    acc_token = get_auth_token(client, "accounts@everest.test", "Accounts@123")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    store_headers = {"Authorization": f"Bearer {store_token}"}
    op_headers = {"Authorization": f"Bearer {op_token}"}
    qi_headers = {"Authorization": f"Bearer {qi_token}"}
    acc_headers = {"Authorization": f"Bearer {acc_token}"}

    unique_run = uuid.uuid4().hex[:6]
    test_colour = f"Sapphire-{unique_run}"

    # 1. Register raw material
    mat_res = client.post("/api/inventory/materials", json={
        "yarn_type": f"Cotton Combed 30s {unique_run}",
        "colour": test_colour,
        "quantity_on_hand": 150.0,
        "unit": "kg",
        "reorder_threshold": 50.0
    }, headers=store_headers)
    assert mat_res.status_code == 201
    mat_id = mat_res.json()["id"]

    # 2. Create customer order for 200m
    buyers = client.get("/api/orders/meta/buyers", headers=store_headers).json()
    buyer_id = buyers[0]["id"]
    order_res = client.post("/api/orders", json={
        "buyer_id": buyer_id,
        "fabric_type": f"Sapphire Twill {unique_run}",
        "colour": test_colour,
        "quantity_metres": 200.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "unit_price": 7.50
    }, headers=store_headers)
    assert order_res.status_code == 201
    order = order_res.json()
    order_id = order["id"]
    assert order["total_revenue"] == 1500.0

    # 3. Check material availability (200m * 0.25 = 50 kg required vs 150 kg available)
    check_res = client.post(f"/api/orders/{order_id}/material-check", headers=store_headers)
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert check_data["sufficient"] is True
    assert check_data["required_yarn_kg"] == 50.0
    assert check_data["status_updated"] == "material_check"

    # 4. Register weaving loom & create batch
    mac_res = client.post("/api/production/machines", json={
        "name": f"Rapier-Pipe-{unique_run}",
        "type": "weaving",
        "status": "idle"
    }, headers=op_headers)
    assert mac_res.status_code == 201
    machine_id = mac_res.json()["id"]

    batch_res = client.post("/api/production/batches", json={
        "order_id": order_id,
        "stage": "weaving",
        "machine_id": machine_id,
        "shift": "morning"
    }, headers=op_headers)
    assert batch_res.status_code == 201
    batch_id = batch_res.json()["id"]

    # 5. Record 200m output -> creates two 100m rolls
    output_res = client.post(f"/api/production/batches/{batch_id}/output", json={
        "output_metres": 200.0,
        "downtime_minutes": 5,
        "create_fabric_rolls": True,
        "mark_completed": True
    }, headers=op_headers)
    assert output_res.status_code == 200
    assert output_res.json()["fabric_rolls_count"] == 2

    # 6. Quality Inspection
    rolls = client.get(f"/api/quality/rolls?order_id={order_id}", headers=qi_headers).json()
    assert len(rolls) == 2
    roll1_id = rolls[0]["id"]
    roll2_id = rolls[1]["id"]

    # Roll 1 passed -> enrolled in finished goods
    insp1 = client.post("/api/quality/inspections", json={
        "roll_id": roll1_id,
        "result": "passed",
        "defect_category": "none"
    }, headers=qi_headers)
    assert insp1.status_code == 201

    r1_check = client.get(f"/api/quality/rolls/{roll1_id}", headers=qi_headers).json()
    assert r1_check["finished_good_status"] == "available"

    # Roll 2 inspect passed, then re-inspect rework -> finished good removed
    client.post("/api/quality/inspections", json={
        "roll_id": roll2_id,
        "result": "passed",
        "defect_category": "none"
    }, headers=qi_headers)
    client.post("/api/quality/inspections", json={
        "roll_id": roll2_id,
        "result": "rework",
        "defect_category": "weave_flaw",
        "notes": "Tension defect on filling"
    }, headers=qi_headers)

    r2_check = client.get(f"/api/quality/rolls/{roll2_id}", headers=qi_headers).json()
    assert r2_check["finished_good_status"] is None

    # 7. Finished goods & Dispatch
    fgs = client.get(f"/api/dispatch/finished-goods?order_id={order_id}", headers=store_headers).json()
    assert len(fgs) == 1
    assert fgs[0]["roll_id"] == roll1_id

    inv_num = f"INV-E2E-{unique_run.upper()}"
    disp_res = client.post("/api/dispatch", json={
        "order_id": order_id,
        "roll_ids": [roll1_id],
        "invoice_number": inv_num
    }, headers=store_headers)
    assert disp_res.status_code == 201
    assert disp_res.json()["total_metres"] == 100.0

    # 8. Finance operations
    exp_res = client.post("/api/finance/expenses", json={
        "order_id": order_id,
        "category": "dye_chemicals",
        "amount": 120.0,
        "description": "Warp sizing starches"
    }, headers=acc_headers)
    assert exp_res.status_code == 201

    pay_res = client.post("/api/finance/payments", json={
        "order_id": order_id,
        "amount": 1000.0,
        "payment_method": "bank_transfer",
        "status": "received",
        "transaction_reference": f"TXN-{unique_run.upper()}"
    }, headers=acc_headers)
    assert pay_res.status_code == 201

    # Verify order financial summary calculation
    summaries = client.get("/api/finance/order-summaries", headers=acc_headers).json()
    order_summary = next(s for s in summaries if s["order_id"] == order_id)
    assert order_summary["total_revenue"] == 1500.0
    assert order_summary["material_cost"] == 175.0  # 200 * 0.25 * 3.50
    assert order_summary["expenses_cost"] == 120.0
    assert order_summary["total_cost"] == 295.0
    assert order_summary["gross_profit"] == 1205.0
    assert order_summary["total_paid"] == 1000.0
    assert order_summary["balance_due"] == 500.0
    assert order_summary["financial_status"] == "Partially Paid"
