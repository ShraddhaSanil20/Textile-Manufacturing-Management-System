from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse
from app.core.security import normalize_email, hash_password
from app.core.deps import require_roles

router = APIRouter(prefix="/users", tags=["users"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin"))
):
    """Admin only: Create staff user with any specified role."""
    email = normalize_email(request.email)
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
        role=request.role or UserRole.buyer,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse.model_validate(new_user)

@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin"))
):
    """Admin only: List all registered users."""
    users = db.query(User).order_by(User.id.asc()).all()
    return [UserResponse.model_validate(u) for u in users]
