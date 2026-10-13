"""
Authentication Router.
Exposes endpoints for user login and current profile resolution.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, status

from backend.app.core.security import (
    DEFAULT_USERS, verify_password, create_access_token, get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class UserProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    hospital: str


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """Authenticates clinician or administrator and returns JWT token."""
    user = DEFAULT_USERS.get(req.email.lower().strip())
    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    token = create_access_token({
        "sub": user["email"],
        "id": user["id"],
        "role": user["role"],
        "name": user["name"],
        "hospital": user["hospital"]
    })

    user_info = {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "hospital": user["hospital"]
    }

    return LoginResponse(access_token=token, token_type="bearer", user=user_info)


@router.get("/me", response_model=UserProfileResponse)
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """Returns the authenticated clinician or admin profile."""
    return UserProfileResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        hospital=user.get("hospital", "Hospital A")
    )
