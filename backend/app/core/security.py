"""
Security & Authentication Core.
Provides JWT token creation, verification, password hashing, and role-based access control.
Roles: 'viewer', 'clinician', 'admin'.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

SECRET_KEY = "sepsiswatch-x-clinical-early-warning-secret-key-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Seed clinical accounts
DEFAULT_USERS = {
    "clinician@sepsiswatch.org": {
        "id": "usr_clinician_01",
        "email": "clinician@sepsiswatch.org",
        "name": "Dr. J. Preethika, MD",
        "role": "clinician",
        "hospital": "Hospital A",
        "hashed_password": hashlib.sha256("sepsiswatch2026".encode()).hexdigest()
    },
    "admin@sepsiswatch.org": {
        "id": "usr_admin_01",
        "email": "admin@sepsiswatch.org",
        "name": "Platform Administrator",
        "role": "admin",
        "hospital": "Hospital A",
        "hashed_password": hashlib.sha256("admin2026".encode()).hexdigest()
    },
    "viewer@sepsiswatch.org": {
        "id": "usr_viewer_01",
        "email": "viewer@sepsiswatch.org",
        "name": "Clinical Observer",
        "role": "viewer",
        "hospital": "Hospital B",
        "hashed_password": hashlib.sha256("viewer2026".encode()).hexdigest()
    }
}


def hash_password(password: str) -> str:
    """Computes SHA-256 hash of password."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password matches hash."""
    return hash_password(plain_password) == hashed_password


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Dependency returning authenticated user or default fallback clinician for demo usability."""
    if not token:
        # Seamless demo mode fallback: return clinician
        return DEFAULT_USERS["clinician@sepsiswatch.org"]

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload["sub"]
    user = DEFAULT_USERS.get(email)
    if not user:
        return {
            "id": payload.get("id", "usr_custom"),
            "email": email,
            "name": payload.get("name", "Authenticated Clinician"),
            "role": payload.get("role", "clinician"),
            "hospital": payload.get("hospital", "Hospital A")
        }
    return user


def require_role(allowed_roles: list[str]):
    """Role-based authorization dependency factory."""
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of roles: {allowed_roles}. Current role: {user.get('role')}"
            )
        return user
    return role_checker
