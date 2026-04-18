import pytest

pytestmark = pytest.mark.asyncio


async def test_register_success(client):
    res = await client.post("/auth/register", json={
        "org_name": "Riverside FBO",
        "email": "riverside@fbo.com",
        "password": "secure123",
    })
    assert res.status_code == 201
    assert "access_token" in res.json()


async def test_register_duplicate_email(client):
    payload = {"org_name": "FBO A", "email": "dup@fbo.com", "password": "pass"}
    await client.post("/auth/register", json=payload)
    res = await client.post("/auth/register", json=payload)
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"].lower()


async def test_login_success(client):
    await client.post("/auth/register", json={
        "org_name": "Login FBO", "email": "login@fbo.com", "password": "mypass",
    })
    res = await client.post("/auth/login", json={"email": "login@fbo.com", "password": "mypass"})
    assert res.status_code == 200
    assert "access_token" in res.json()


async def test_login_wrong_password(client):
    await client.post("/auth/register", json={
        "org_name": "FBO B", "email": "wrongpass@fbo.com", "password": "correct",
    })
    res = await client.post("/auth/login", json={"email": "wrongpass@fbo.com", "password": "wrong"})
    assert res.status_code == 401


async def test_login_unknown_email(client):
    res = await client.post("/auth/login", json={"email": "ghost@fbo.com", "password": "any"})
    assert res.status_code == 401


async def test_me_returns_org_info(auth_client):
    client, headers = auth_client
    res = await client.get("/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["org_name"] == "Test FBO"
    assert data["email"] == "test@fbo.com"
    assert "logo" in data


async def test_me_unauthenticated(client):
    res = await client.get("/auth/me")
    assert res.status_code == 401


async def test_update_profile_org_name(auth_client):
    client, headers = auth_client
    res = await client.patch("/auth/profile", json={"org_name": "Updated FBO"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["org_name"] == "Updated FBO"


async def test_update_profile_unauthenticated(client):
    res = await client.patch("/auth/profile", json={"org_name": "Hacker"})
    assert res.status_code == 401
