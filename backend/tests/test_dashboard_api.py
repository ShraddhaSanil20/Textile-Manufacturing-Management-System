import pytest

def get_auth_token(client, email, password):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_dashboard_rbac_protection(client):
    """Test RBAC on executive dashboard telemetry."""
    buyer_token = get_auth_token(client, "buyer@everest.test", "Buyer@123")
    admin_token = get_auth_token(client, "admin@everest.test", "Admin@123")

    # Buyer cannot view executive dashboard
    res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {buyer_token}"})
    assert res.status_code == 403

    # Admin can view dashboard
    res_admin = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200

def test_dashboard_telemetry_payload_structure(client):
    """Test that dashboard returns comprehensive operational and financial metrics."""
    admin_token = get_auth_token(client, "admin@everest.test", "Admin@123")
    res = client.get("/api/dashboard/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    data = res.json()
    assert "total_orders" in data
    assert "active_orders" in data
    assert "total_produced_metres" in data
    assert "total_dispatched_metres" in data
    assert "low_stock_alerts_count" in data

    # Machine fleet
    fleet = data["machine_fleet"]
    assert "running" in fleet
    assert "idle" in fleet
    assert "total" in fleet

    # Quality metrics
    quality = data["quality"]
    assert "pass_rate_pct" in quality
    assert "defect_breakdown" in quality
    assert "stain" in quality["defect_breakdown"]

    # Financial KPIs
    finance = data["finance"]
    assert "total_revenue" in finance
    assert "gross_profit" in finance
    assert "gross_margin_pct" in finance
    assert "total_cost" in finance

    # Stage trends
    assert len(data["production_by_stage"]) == 3
