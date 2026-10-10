from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import LoginRequest, TokenResponse, UserRegister, UserResponse
from app.core.security import (
    normalize_email,
    hash_password,
    verify_password,
    create_access_token
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password via JSON payload."""
    email = normalize_email(request.email)
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )

    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    token = create_access_token(user_id=user.id, role=role_val)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user details."""
    return UserResponse.model_validate(current_user)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(request: UserRegister, db: Session = Depends(get_db)):
    """Public self-registration that strictly creates buyer accounts only."""
    email = normalize_email(request.email)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email cannot be empty"
        )

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )

    hashed_pw = hash_password(request.password)

    new_user = User(
        full_name=request.full_name.strip(),
        email=email,
        hashed_password=hashed_pw,
        role=UserRole.buyer,  # Strictly forces buyer role
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse.model_validate(new_user)
