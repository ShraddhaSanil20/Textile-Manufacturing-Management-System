from datetime import datetime, timezone, timedelta
from typing import Optional, Any, Dict
import bcrypt
import jwt
from fastapi import HTTPException, status
from app.core.config import settings

def normalize_email(email: str) -> str:
    """Normalize email to lowercase and strip surrounding whitespace."""
    if not email:
        return ""
    return email.strip().lower()

def hash_password(password: str) -> str:
    """
    Hash a password using the bcrypt package directly.
    Rejects passwords longer than 72 bytes with HTTP 422 as required by specification.
    """
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password exceeds the 72-byte limit for bcrypt hashing."
        )
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hashed password."""
    try:
        plain_bytes = plain_password.encode("utf-8")
        if len(plain_bytes) > 72:
            return False
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def create_access_token(user_id: int, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT token containing sub, role, and exp."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
        "iat": now
    }
    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT access token.
    Raises HTTPException 401 if missing, invalid, or expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
