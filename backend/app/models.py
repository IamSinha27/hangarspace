import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class RoofType(str, enum.Enum):
    flat = "flat"
    gabled = "gabled"
    arched = "arched"


class WingType(str, enum.Enum):
    high = "high"
    mid  = "mid"
    low  = "low"


class Org(Base):
    __tablename__ = "orgs"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    logo = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="org")
    hangars = relationship("Hangar", back_populates="org")
    aircraft_specs = relationship("AircraftSpec", back_populates="org")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    org = relationship("Org", back_populates="users")


class AircraftSpec(Base):
    __tablename__ = "aircraft_specs"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False)
    name = Column(String, nullable=False)
    length_m = Column(Float, nullable=False)
    wingspan_m = Column(Float, nullable=False)
    tail_height_m = Column(Float, nullable=False)
    fuselage_width_m = Column(Float, nullable=False)
    wing_root_height_m = Column(Float, nullable=False)
    wing_thickness_m = Column(Float, nullable=False)
    wing_type = Column(Enum(WingType), nullable=False)
    elevator_span_m = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    org = relationship("Org", back_populates="aircraft_specs")
    placed = relationship("PlacedAircraft", back_populates="spec", passive_deletes=True)


class Hangar(Base):
    __tablename__ = "hangars"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("orgs.id"), nullable=False)
    name = Column(String, nullable=False)
    length_m = Column(Float, nullable=False)
    width_m = Column(Float, nullable=False)
    height_m = Column(Float, nullable=False)
    roof_type = Column(Enum(RoofType), nullable=False, default=RoofType.flat)
    roof_peak_height_m = Column(Float, nullable=False)
    roof_eave_height_m = Column(Float, nullable=False)
    buffer_m = Column(Float, nullable=False, default=0.9144)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    org = relationship("Org", back_populates="hangars")
    layouts = relationship("Layout", back_populates="hangar", cascade="all, delete-orphan")


class Layout(Base):
    __tablename__ = "layouts"

    id = Column(Integer, primary_key=True)
    hangar_id = Column(Integer, ForeignKey("hangars.id"), nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    hangar = relationship("Hangar", back_populates="layouts")
    placed_aircraft = relationship("PlacedAircraft", back_populates="layout", cascade="all, delete-orphan")


class PlacedAircraft(Base):
    __tablename__ = "placed_aircraft"

    id = Column(Integer, primary_key=True)
    layout_id = Column(Integer, ForeignKey("layouts.id"), nullable=False)
    spec_id = Column(Integer, ForeignKey("aircraft_specs.id", ondelete="CASCADE"), nullable=False)
    x_m = Column(Float, nullable=False, default=0.0)
    z_m = Column(Float, nullable=False, default=0.0)
    rotation_rad = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    layout = relationship("Layout", back_populates="placed_aircraft")
    spec = relationship("AircraftSpec", back_populates="placed")
