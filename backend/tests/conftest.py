import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.main import app
from app.database import Base, get_db

TEST_DB_URL = "postgresql+asyncpg://shubham@localhost:5432/hangarspace_test"

# NullPool: every context gets a brand-new connection — no sharing, no interference.
engine_test = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)
TestingSession = sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
async def clean_tables():
    yield
    # Truncate in reverse dependency order so FK constraints don't block.
    async with engine_test.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


@pytest.fixture
async def client():
    async def override_get_db():
        async with TestingSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_client(client):
    await client.post("/auth/register", json={
        "org_name": "Test FBO",
        "email": "test@fbo.com",
        "password": "password123",
    })
    res = await client.post("/auth/login", json={
        "email": "test@fbo.com",
        "password": "password123",
    })
    token = res.json()["access_token"]
    return client, {"Authorization": f"Bearer {token}"}
