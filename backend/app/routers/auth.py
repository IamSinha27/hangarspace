from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..database import get_db
from ..models import Org, User

from ..auth.utils import hash_password, verify_password, create_token
from ..auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    org_name: str
    email: EmailStr
    password: str
    logo: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileUpdate(BaseModel):
    org_name: Optional[str] = None
    logo: Optional[str] = None


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    org = Org(name=body.org_name, logo=body.logo)
    db.add(org)
    await db.flush()

    user = User(org_id=org.id, email=body.email, hashed_password=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {"access_token": create_token(user.id, user.org_id)}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Org).where(Org.id == current_user.org_id))
    org = result.scalar_one()
    return {"email": current_user.email, "org_name": org.name, "logo": org.logo}


@router.patch("/profile")
async def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Org).where(Org.id == current_user.org_id))
    org = result.scalar_one()
    if body.org_name is not None:
        org.name = body.org_name
    if body.logo is not None:
        org.logo = body.logo
    await db.commit()
    await db.refresh(org)
    return {"email": current_user.email, "org_name": org.name, "logo": org.logo}


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"access_token": create_token(user.id, user.org_id)}
