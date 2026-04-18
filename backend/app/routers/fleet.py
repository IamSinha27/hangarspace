from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models import AircraftSpec, WingType
from ..auth.dependencies import get_current_user
from ..models import User

router = APIRouter(prefix="/fleet", tags=["fleet"])


class SpecCreate(BaseModel):
    name: str
    length_m: float
    wingspan_m: float
    tail_height_m: float
    fuselage_width_m: float
    wing_root_height_m: float
    wing_thickness_m: float
    wing_type: WingType
    elevator_span_m: float = 0.0


class SpecUpdate(BaseModel):
    name: Optional[str] = None
    length_m: Optional[float] = None
    wingspan_m: Optional[float] = None
    tail_height_m: Optional[float] = None
    fuselage_width_m: Optional[float] = None
    wing_root_height_m: Optional[float] = None
    wing_thickness_m: Optional[float] = None
    wing_type: Optional[WingType] = None
    elevator_span_m: Optional[float] = None


@router.get("")
async def list_fleet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AircraftSpec).where(AircraftSpec.org_id == current_user.org_id))
    return result.scalars().all()


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_spec(
    body: SpecCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    spec = AircraftSpec(**body.model_dump(), org_id=current_user.org_id)
    db.add(spec)
    await db.commit()
    await db.refresh(spec)
    return spec


@router.patch("/{spec_id}")
async def update_spec(
    spec_id: int,
    body: SpecUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AircraftSpec).where(AircraftSpec.id == spec_id, AircraftSpec.org_id == current_user.org_id)
    )
    spec = result.scalar_one_or_none()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(spec, field, value)

    await db.commit()
    await db.refresh(spec)
    return spec


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_fleet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(delete(AircraftSpec).where(AircraftSpec.org_id == current_user.org_id))
    await db.commit()


@router.delete("/{spec_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_spec(
    spec_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AircraftSpec).where(AircraftSpec.id == spec_id, AircraftSpec.org_id == current_user.org_id)
    )
    spec = result.scalar_one_or_none()
    if not spec:
        raise HTTPException(status_code=404, detail="Spec not found")

    await db.delete(spec)
    await db.commit()
