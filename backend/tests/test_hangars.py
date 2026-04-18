import pytest

pytestmark = pytest.mark.asyncio

HANGAR = {
    "name": "North Hangar",
    "length_m": 30.48,
    "width_m": 41.45,
    "height_m": 8.53,
    "roof_type": "flat",
    "roof_peak_height_m": 8.53,
    "roof_eave_height_m": 6.10,
    "buffer_m": 0.9144,
}


async def _add_hangar(client, headers, overrides=None):
    payload = {**HANGAR, **(overrides or {})}
    res = await client.post("/hangars", json=payload, headers=headers)
    assert res.status_code == 201
    return res.json()


async def _add_spec(client, headers):
    res = await client.post("/fleet", json={
        "name": "Cessna 172",
        "length_m": 8.28, "wingspan_m": 11.0, "tail_height_m": 2.72,
        "fuselage_width_m": 1.1, "wing_root_height_m": 0.8,
        "wing_thickness_m": 0.2, "wing_type": "high", "elevator_span_m": 0,
    }, headers=headers)
    return res.json()


async def test_list_hangars_empty(auth_client):
    client, headers = auth_client
    res = await client.get("/hangars", headers=headers)
    assert res.status_code == 200
    assert res.json() == []


async def test_create_hangar(auth_client):
    client, headers = auth_client
    res = await client.post("/hangars", json=HANGAR, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "North Hangar"
    assert data["roof_type"] == "flat"
    assert "id" in data


async def test_create_hangar_door_wall_defaults_to_south(auth_client):
    client, headers = auth_client
    res = await client.post("/hangars", json=HANGAR, headers=headers)
    assert res.status_code == 201
    assert res.json()["door_wall"] == "south"


async def test_get_hangar(auth_client):
    client, headers = auth_client
    created = await _add_hangar(client, headers)
    res = await client.get(f"/hangars/{created['id']}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "North Hangar"
    assert "placed_aircraft" in data
    assert data["door_wall"] == "south"


async def test_update_hangar_door_wall(auth_client):
    client, headers = auth_client
    created = await _add_hangar(client, headers)
    res = await client.patch(f"/hangars/{created['id']}", json={"door_wall": "north"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["door_wall"] == "north"


async def test_get_hangar_not_found(auth_client):
    client, headers = auth_client
    res = await client.get("/hangars/999999", headers=headers)
    assert res.status_code == 404


async def test_rename_hangar(auth_client):
    client, headers = auth_client
    created = await _add_hangar(client, headers)
    res = await client.patch(f"/hangars/{created['id']}", json={"name": "South Hangar"}, headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "South Hangar"


async def test_update_hangar_dimensions(auth_client):
    client, headers = auth_client
    created = await _add_hangar(client, headers)
    res = await client.patch(f"/hangars/{created['id']}", json={"length_m": 50.0, "width_m": 60.0}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["length_m"] == 50.0
    assert data["width_m"] == 60.0


async def test_delete_hangar(auth_client):
    client, headers = auth_client
    created = await _add_hangar(client, headers)
    res = await client.delete(f"/hangars/{created['id']}", headers=headers)
    assert res.status_code == 204

    res = await client.get(f"/hangars/{created['id']}", headers=headers)
    assert res.status_code == 404


async def test_save_and_load_layout(auth_client):
    client, headers = auth_client
    hangar = await _add_hangar(client, headers)
    spec = await _add_spec(client, headers)

    placed = [{"spec_id": spec["id"], "x_m": 5.0, "z_m": 3.0, "rotation_rad": 0.0}]
    res = await client.put(f"/hangars/{hangar['id']}/layout", json={"placed_aircraft": placed}, headers=headers)
    assert res.status_code == 200

    loaded = (await client.get(f"/hangars/{hangar['id']}", headers=headers)).json()
    assert len(loaded["placed_aircraft"]) == 1
    assert loaded["placed_aircraft"][0]["x_m"] == 5.0
    assert loaded["placed_aircraft"][0]["spec_id"] == spec["id"]


async def test_save_layout_replaces_previous(auth_client):
    client, headers = auth_client
    hangar = await _add_hangar(client, headers)
    spec = await _add_spec(client, headers)

    # First save — 2 aircraft
    await client.put(f"/hangars/{hangar['id']}/layout", json={"placed_aircraft": [
        {"spec_id": spec["id"], "x_m": 0.0, "z_m": 0.0, "rotation_rad": 0.0},
        {"spec_id": spec["id"], "x_m": 5.0, "z_m": 0.0, "rotation_rad": 0.0},
    ]}, headers=headers)

    # Second save — 1 aircraft
    await client.put(f"/hangars/{hangar['id']}/layout", json={"placed_aircraft": [
        {"spec_id": spec["id"], "x_m": 0.0, "z_m": 0.0, "rotation_rad": 0.0},
    ]}, headers=headers)

    loaded = (await client.get(f"/hangars/{hangar['id']}", headers=headers)).json()
    assert len(loaded["placed_aircraft"]) == 1


async def test_hangar_org_isolation(client):
    """Org A cannot access Org B's hangar."""
    await client.post("/auth/register", json={"org_name": "FBO X", "email": "x@fbo.com", "password": "pass"})
    await client.post("/auth/register", json={"org_name": "FBO Y", "email": "y@fbo.com", "password": "pass"})

    token_x = (await client.post("/auth/login", json={"email": "x@fbo.com", "password": "pass"})).json()["access_token"]
    token_y = (await client.post("/auth/login", json={"email": "y@fbo.com", "password": "pass"})).json()["access_token"]

    headers_x = {"Authorization": f"Bearer {token_x}"}
    headers_y = {"Authorization": f"Bearer {token_y}"}

    hangar_x = (await client.post("/hangars", json=HANGAR, headers=headers_x)).json()

    # Org Y tries to access Org X's hangar
    res = await client.get(f"/hangars/{hangar_x['id']}", headers=headers_y)
    assert res.status_code == 404


async def test_hangars_unauthenticated(client):
    res = await client.get("/hangars")
    assert res.status_code == 401


async def test_delete_spec_removes_placed_aircraft(auth_client):
    """Deleting a fleet spec must cascade-remove it from all hangar layouts."""
    client, headers = auth_client
    hangar = await _add_hangar(client, headers)
    spec = await _add_spec(client, headers)

    # Place the aircraft in the hangar
    await client.put(f"/hangars/{hangar['id']}/layout", json={
        "placed_aircraft": [{"spec_id": spec["id"], "x_m": 5.0, "z_m": 3.0, "rotation_rad": 0.0}]
    }, headers=headers)

    # Confirm it's there
    loaded = (await client.get(f"/hangars/{hangar['id']}", headers=headers)).json()
    assert len(loaded["placed_aircraft"]) == 1

    # Delete the spec
    await client.delete(f"/fleet/{spec['id']}", headers=headers)

    # Placed aircraft must be gone from the layout
    loaded = (await client.get(f"/hangars/{hangar['id']}", headers=headers)).json()
    assert len(loaded["placed_aircraft"]) == 0
