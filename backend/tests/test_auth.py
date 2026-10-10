import pytest
from datetime import timedelta
from app.models.user import User, UserRole
from app.core.security import create_access_token

ROLES_CREDENTIALS = [
    ("admin@everest.test", "Admin@123", "admin"),
    ("store@everest.test", "Store@123", "store_manager"),
    ("production@everest.test", "Prod@123", "production_operator"),
    ("quality@everest.test", "Quality@123", "quality_inspector"),
    ("accounts@everest.test", "Accounts@123", "accounts"),
    ("buyer@everest.test", "Buyer@123", "buyer"),
]

def test_login_succeeds_for_each_seeded_role(client):
    """Test 1: login succeeds for each seeded role and returns a token and user."""
    for email, password, role in ROLES_CREDENTIALS:
        response = client.post(
            "/api/auth/login",
            json={"email": email, "password": password}
        )
        assert response.status_code == 200, f"Failed for {email}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == email.lower()
        assert data["user"]["role"] == role

def test_wrong_password_returns_401(client):
    """Test 2: wrong password returns 401 with 'Invalid email or password'."""
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@everest.test", "password": "WrongPassword!999"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_unknown_email_returns_401(client):
    """Test 3: unknown email returns 401 with the exact same message."""
    response = client.post(
        "/api/auth/login",
        json={"email": "doesnotexist@everest.test", "password": "SomePassword@123"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"

def test_email_is_case_insensitive(client):
    """Test 4: email is case-insensitive (UPPERCASE and mixed case work)."""
    response_upper = client.post(
        "/api/auth/login",
        json={"email": "ADMIN@EVEREST.TEST", "password": "Admin@123"}
    )
    assert response_upper.status_code == 200
    assert response_upper.json()["user"]["email"] == "admin@everest.test"

    response_mixed = client.post(
        "/api/auth/login",
        json={"email": "  AdMiN@Everest.Test  ", "password": "Admin@123"}
    )
    assert response_mixed.status_code == 200
    assert response_mixed.json()["user"]["email"] == "admin@everest.test"

def test_auth_me_scenarios(client):
    """Test 5: GET /api/auth/me works with valid token, returns 401 with no token, garbage token, expired token."""
    # 5a: Valid token
    login_res = client.post(
        "/api/auth/login",
        json={"email": "admin@everest.test", "password": "Admin@123"}
    )
    token = login_res.json()["access_token"]
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "admin@everest.test"

    # 5b: No token
    res_no_token = client.get("/api/auth/me")
    assert res_no_token.status_code == 401

    # 5c: Garbage token
    res_garbage = client.get("/api/auth/me", headers={"Authorization": "Bearer thisisnotavalidtoken.garbage.payload"})
    assert res_garbage.status_code == 401

    # 5d: Expired token
    expired_token = create_access_token(user_id=1, role="admin", expires_delta=timedelta(seconds=-10))
    res_expired = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res_expired.status_code == 401
    assert "expired" in res_expired.json()["detail"].lower()

def test_buyer_calling_admin_endpoint_gets_403(client):
    """Test 6: a buyer calling an admin-only endpoint gets 403."""
    buyer_login = client.post(
        "/api/auth/login",
        json={"email": "buyer@everest.test", "password": "Buyer@123"}
    )
    buyer_token = buyer_login.json()["access_token"]
    admin_res = client.get("/api/users", headers={"Authorization": f"Bearer {buyer_token}"})
    assert admin_res.status_code == 403
    assert "not permitted" in admin_res.json()["detail"].lower()

def test_register_creates_only_buyer_accounts(client, db_session):
    """Test 7: register creates only buyer accounts even if payload specifies admin."""
    unique_email = "newbuyer_test@everest.test"
    db_session.query(User).filter(User.email == unique_email).delete()
    db_session.commit()

    reg_res = client.post(
        "/api/auth/register",
        json={
            "full_name": "Test Self Registered",
            "email": unique_email,
            "password": "Password@123",
            "role": "admin"  # Malicious attempt to register as admin
        }
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["role"] == "buyer"  # MUST be buyer!

    # Verify directly in database
    created_user = db_session.query(User).filter(User.email == unique_email).first()
    assert created_user is not None
    assert created_user.role == UserRole.buyer

def test_inactive_user_cannot_login(client, db_session):
    """Test 8: inactive user cannot log in (403 Account is disabled)."""
    disabled_email = "disabled_user@everest.test"
    db_session.query(User).filter(User.email == disabled_email).delete()
    db_session.commit()

    # Create inactive user directly
    from app.core.security import hash_password
    disabled_user = User(
        full_name="Disabled User",
        email=disabled_email,
        hashed_password=hash_password("Disabled@123"),
        role=UserRole.buyer,
        is_active=False
    )
    db_session.add(disabled_user)
    db_session.commit()

    response = client.post(
        "/api/auth/login",
        json={"email": disabled_email, "password": "Disabled@123"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is disabled"

def test_passwords_are_stored_hashed(db_session):
    """Test 9: passwords are stored hashed (never plain text)."""
    users = db_session.query(User).all()
    assert len(users) > 0
    for u in users:
        assert u.hashed_password is not None
        assert not u.hashed_password.startswith("Admin@")
        assert not u.hashed_password.startswith("Buyer@")
        assert not u.hashed_password.startswith("Store@")
        assert not u.hashed_password.startswith("Prod@")
        assert not u.hashed_password.startswith("Quality@")
        assert not u.hashed_password.startswith("Accounts@")
        # Bcrypt hashes start with $2a$, $2b$ or $2y$ and are 60 characters
        assert u.hashed_password.startswith(("$2a$", "$2b$", "$2y$")), f"Invalid hash: {u.hashed_password}"
        assert len(u.hashed_password) == 60
