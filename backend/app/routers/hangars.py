from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models import Hangar, Layout, PlacedAircraft, RoofType
from ..auth.dependencies import get_current_user
from ..models import User

router = APIRouter(prefix="/hangars", tags=["hangars"])


class HangarCreate(BaseModel):
    name: str
    length_m: float
    width_m: float
    height_m: float
    roof_type: RoofType
    roof_peak_height_m: float
    roof_eave_height_m: float
    buffer_m: float = 0.9144


class HangarUpdate(BaseModel):
    name: Optional[str] = None
    length_m: Optional[float] = None
    width_m: Optional[float] = None
    height_m: Optional[float] = None
    roof_type: Optional[RoofType] = None
    roof_peak_height_m: Optional[float] = None
    roof_eave_height_m: Optional[float] = None
    buffer_m: Optional[float] = None


class PlacedAircraftIn(BaseModel):
    spec_id: int
    x_m: float
    z_m: float
    rotation_rad: float


class LayoutSave(BaseModel):
    placed_aircraft: list[PlacedAircraftIn]


@router.get("")
async def list_hangars(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Hangar).where(Hangar.org_id == current_user.org_id))
    return result.scalars().all()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_hangar(
    body: HangarCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hangar = Hangar(**body.model_dump(), org_id=current_user.org_id)
    db.add(hangar)
    await db.flush()

    layout = Layout(hangar_id=hangar.id, name="Default", is_active=True)
    db.add(layout)
    await db.commit()
    await db.refresh(hangar)
    return hangar


@router.get("/{hangar_id}")
async def get_hangar(
    hangar_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Hangar)
        .where(Hangar.id == hangar_id, Hangar.org_id == current_user.org_id)
        .options(selectinload(Hangar.layouts).selectinload(Layout.placed_aircraft))
    )
    hangar = result.scalar_one_or_none()
    if not hangar:
        raise HTTPException(status_code=404, detail="Hangar not found")

    active_layout = next((l for l in hangar.layouts if l.is_active), None)
    return {
        "id": hangar.id,
        "name": hangar.name,
        "length_m": hangar.length_m,
        "width_m": hangar.width_m,
        "height_m": hangar.height_m,
        "roof_type": hangar.roof_type,
        "roof_peak_height_m": hangar.roof_peak_height_m,
        "roof_eave_height_m": hangar.roof_eave_height_m,
        "buffer_m": hangar.buffer_m,
        "layout_id": active_layout.id if active_layout else None,
        "placed_aircraft": [
            {
                "id": p.id,
                "spec_id": p.spec_id,
                "x_m": p.x_m,
                "z_m": p.z_m,
                "rotation_rad": p.rotation_rad,
            }
            for p in (active_layout.placed_aircraft if active_layout else [])
        ],
    }


@router.patch("/{hangar_id}")
async def update_hangar(
    hangar_id: int,
    body: HangarUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Hangar).where(Hangar.id == hangar_id, Hangar.org_id == current_user.org_id))
    hangar = result.scalar_one_or_none()
    if not hangar:
        raise HTTPException(status_code=404, detail="Hangar not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(hangar, field, value)

    await db.commit()
    await db.refresh(hangar)
    return hangar


@router.delete("/{hangar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hangar(
    hangar_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Hangar).where(Hangar.id == hangar_id, Hangar.org_id == current_user.org_id))
    hangar = result.scalar_one_or_none()
    if not hangar:
        raise HTTPException(status_code=404, detail="Hangar not found")
    await db.delete(hangar)
    await db.commit()


@router.put("/{hangar_id}/layout")
async def save_layout(
    hangar_id: int,
    body: LayoutSave,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Layout)
        .join(Hangar)
        .where(Hangar.id == hangar_id, Hangar.org_id == current_user.org_id, Layout.is_active == True)
    )
    layout = result.scalar_one_or_none()
    if not layout:
        raise HTTPException(status_code=404, detail="Active layout not found")

    await db.execute(
        PlacedAircraft.__table__.delete().where(PlacedAircraft.layout_id == layout.id)
    )

    for p in body.placed_aircraft:
        db.add(PlacedAircraft(layout_id=layout.id, **p.model_dump()))

    await db.commit()
    return {"saved": len(body.placed_aircraft)}
