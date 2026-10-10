import pytest
from datetime import datetime, timezone, timedelta

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_finance_rbac_protection(client):
    """Test RBAC on finance and accounting endpoints."""
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    acc_token = get_auth_token(client, "accounts@everest.test", "Accounts@123")

    # Buyer cannot view finance summaries
    res = client.get("/api/finance/order-summaries", headers={"Authorization": f"Bearer {buyer_token}"})
    assert res.status_code == 403

    # Accounts officer can view finance summaries
    res_acc = client.get("/api/finance/order-summaries", headers={"Authorization": f"Bearer {acc_token}"})
    assert res_acc.status_code == 200

def test_order_cost_margin_expenses_and_payment_flow(client):
    """
    Test complete financial calculation pipeline:
    1. Order created with 1,000m @ $5.00/m -> $5,000 revenue.
    2. Operational expense logged (dye chemicals: $350).
    3. Buyer payment logged ($3,000 bank transfer).
    4. Verify order cost breakdown, gross profit, margin %, and balance due.
    """
    admin_token = get_auth_token(client, "admin@everest.test", "Admin@123")
    acc_token = get_auth_token(client, "accounts@everest.test", "Accounts@123")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    acc_headers = {"Authorization": f"Bearer {acc_token}"}

    # 1. Create order
    buyers_res = client.get("/api/orders/meta/buyers", headers=admin_headers)
    buyer_id = buyers_res.json()[0]["id"]
    order_res = client.post("/api/orders", json={
        "buyer_id": buyer_id,
        "fabric_type": "Mercerized Poplin 60s",
        "colour": "Cobalt Blue",
        "quantity_metres": 1000.0,
        "due_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "unit_price": 5.00
    }, headers=admin_headers)
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # 2. Record linked direct expense
    exp_res = client.post("/api/finance/expenses", json={
        "order_id": order_id,
        "category": "dye_chemicals",
        "amount": 350.0,
        "description": "Reactive blue dyes and fixation salts"
    }, headers=acc_headers)
    assert exp_res.status_code == 201
    assert exp_res.json()["amount"] == 350.0

    # 3. Record buyer partial payment
    pay_res = client.post("/api/finance/payments", json={
        "order_id": order_id,
        "amount": 3000.0,
        "payment_method": "bank_transfer",
        "status": "received",
        "transaction_reference": "TXN-984210"
    }, headers=acc_headers)
    assert pay_res.status_code == 201
    assert pay_res.json()["amount"] == 3000.0

    # 4. Verify order cost summaries
    summaries_res = client.get("/api/finance/order-summaries", headers=acc_headers)
    assert summaries_res.status_code == 200
    summaries = summaries_res.json()

    target_summary = next(s for s in summaries if s["order_id"] == order_id)
    assert target_summary["total_revenue"] == 5000.0
    assert target_summary["material_cost"] == 875.0  # 1000 * 0.25 * 3.50
    assert target_summary["expenses_cost"] == 350.0
    assert target_summary["total_cost"] == 1225.0
    assert target_summary["gross_profit"] == 3775.0
    assert target_summary["gross_margin_pct"] == 75.5
    assert target_summary["total_paid"] == 3000.0
    assert target_summary["balance_due"] == 2000.0
    assert target_summary["financial_status"] == "Partially Paid"
