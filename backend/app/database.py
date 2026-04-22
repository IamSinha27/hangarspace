from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=True)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with SessionLocal() as session:
        yield session
