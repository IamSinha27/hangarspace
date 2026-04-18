import pytest

pytestmark = pytest.mark.asyncio

SPEC = {
    "name": "Cessna 172",
    "length_m": 8.28,
    "wingspan_m": 11.0,
    "tail_height_m": 2.72,
    "fuselage_width_m": 1.1,
    "wing_root_height_m": 0.8,
    "wing_thickness_m": 0.2,
    "wing_type": "high",
    "elevator_span_m": 3.4,
}


async def test_list_fleet_empty(auth_client):
    client, headers = auth_client
    res = await client.get("/fleet", headers=headers)
    assert res.status_code == 200
    assert res.json() == []


async def test_add_spec(auth_client):
    client, headers = auth_client
    res = await client.post("/fleet", json=SPEC, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Cessna 172"
    assert data["wing_type"] == "high"
    assert "id" in data


async def test_list_fleet_after_add(auth_client):
    client, headers = auth_client
    await client.post("/fleet", json=SPEC, headers=headers)
    res = await client.get("/fleet", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


async def test_update_spec(auth_client):
    client, headers = auth_client
    created = (await client.post("/fleet", json=SPEC, headers=headers)).json()
    res = await client.patch(f"/fleet/{created['id']}", json={"name": "Cessna 172 Skyhawk"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Cessna 172 Skyhawk"


async def test_update_spec_not_found(auth_client):
    client, headers = auth_client
    res = await client.patch("/fleet/999999", json={"name": "Ghost"}, headers=headers)
    assert res.status_code == 404


async def test_delete_spec(auth_client):
    client, headers = auth_client
    created = (await client.post("/fleet", json=SPEC, headers=headers)).json()
    res = await client.delete(f"/fleet/{created['id']}", headers=headers)
    assert res.status_code == 204

    # Confirm it's gone
    fleet = (await client.get("/fleet", headers=headers)).json()
    ids = [s["id"] for s in fleet]
    assert created["id"] not in ids


async def test_delete_spec_not_found(auth_client):
    client, headers = auth_client
    res = await client.delete("/fleet/999999", headers=headers)
    assert res.status_code == 404


async def test_clear_fleet(auth_client):
    client, headers = auth_client
    await client.post("/fleet", json=SPEC, headers=headers)
    await client.post("/fleet", json={**SPEC, "name": "Piper PA-28"}, headers=headers)

    res = await client.delete("/fleet", headers=headers)
    assert res.status_code == 204

    fleet = (await client.get("/fleet", headers=headers)).json()
    assert fleet == []


async def test_org_isolation(client):
    """Org A cannot see Org B's fleet."""
    # Register two orgs
    await client.post("/auth/register", json={"org_name": "FBO Alpha", "email": "alpha@fbo.com", "password": "pass"})
    await client.post("/auth/register", json={"org_name": "FBO Beta",  "email": "beta@fbo.com",  "password": "pass"})

    token_a = (await client.post("/auth/login", json={"email": "alpha@fbo.com", "password": "pass"})).json()["access_token"]
    token_b = (await client.post("/auth/login", json={"email": "beta@fbo.com",  "password": "pass"})).json()["access_token"]

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Org A adds a spec
    await client.post("/fleet", json=SPEC, headers=headers_a)

    # Org B's fleet should be empty
    fleet_b = (await client.get("/fleet", headers=headers_b)).json()
    assert fleet_b == []


async def test_fleet_unauthenticated(client):
    res = await client.get("/fleet")
    assert res.status_code == 401
