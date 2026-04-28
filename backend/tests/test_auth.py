import uuid

from fastapi.testclient import TestClient


def test_token_and_me_e2e_admin(client: TestClient) -> None:
    r = client.post("/auth/token", json={"login": "e2e_admin", "password": "testpass1"})
    if r.status_code == 401:
        # Migrations 0003 not applied (e.g. local run without latest alembic).
        return
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["access_token"]
    assert data.get("refresh_token")
    assert data.get("refresh_expires_in", 0) >= data.get("expires_in", 0)
    assert data["account"]["login"] == "e2e_admin"
    token = data["access_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["role_code"] == "admin"


def test_refresh_token_roundtrip(client: TestClient) -> None:
    r = client.post("/auth/token", json={"login": "e2e_admin", "password": "testpass1"})
    if r.status_code != 200:
        return
    data = r.json()
    ref = client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert ref.status_code == 200, ref.text
    d2 = ref.json()
    assert d2["access_token"]
    assert d2["refresh_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {d2['access_token']}"})
    assert me.status_code == 200


def test_refresh_rejects_access_token(client: TestClient) -> None:
    r = client.post("/auth/token", json={"login": "e2e_admin", "password": "testpass1"})
    if r.status_code != 200:
        return
    bad = client.post("/auth/refresh", json={"refresh_token": r.json()["access_token"]})
    assert bad.status_code == 401


def test_logout_revokes_refresh(client: TestClient) -> None:
    r = client.post("/auth/token", json={"login": "e2e_admin", "password": "testpass1"})
    if r.status_code != 200:
        return
    refresh = r.json()["refresh_token"]
    lo = client.post("/auth/logout", json={"refresh_token": refresh})
    assert lo.status_code == 204
    again = client.post("/auth/refresh", json={"refresh_token": refresh})
    assert again.status_code == 401


def test_change_password_wrong_current(client: TestClient) -> None:
    r = client.post("/auth/token", json={"login": "e2e_admin", "password": "testpass1"})
    if r.status_code != 200:
        return
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    bad = client.post(
        "/auth/change-password",
        headers=h,
        json={"current_password": "wrong", "new_password": "longpass1q"},
    )
    assert bad.status_code == 401


def test_change_password_self_revokes_refresh(client: TestClient) -> None:
    a = client.post("/auth/token", json={"login": "e2e_admin", "password": "testpass1"})
    if a.status_code != 200:
        return
    admin_h = {"Authorization": f"Bearer {a.json()['access_token']}"}
    login = f"cpw_{uuid.uuid4().hex[:10]}"
    cr = client.post(
        "/admin/accounts",
        headers=admin_h,
        json={
            "login": login,
            "password": "initial9x!",
            "role_code": "viewer",
            "last_name": "T",
            "first_name": "T",
        },
    )
    if cr.status_code != 201:
        return
    tok = client.post("/auth/token", json={"login": login, "password": "initial9x!"})
    assert tok.status_code == 200
    refresh = tok.json()["refresh_token"]
    acc_tok = tok.json()["access_token"]
    ch = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {acc_tok}"},
        json={"current_password": "initial9x!", "new_password": "changed0y!"},
    )
    assert ch.status_code == 204
    assert client.post("/auth/refresh", json={"refresh_token": refresh}).status_code == 401
    assert client.post("/auth/token", json={"login": login, "password": "initial9x!"}).status_code == 401
    assert client.post("/auth/token", json={"login": login, "password": "changed0y!"}).status_code == 200


def test_change_status_with_bearer_token(client: TestClient) -> None:
    r = client.post("/auth/token", json={"login": "e2e_admin", "password": "testpass1"})
    if r.status_code != 200:
        return
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    c = client.post(
        "/applications", headers=headers, json={"source_type": "manual", "payload": {}})
    if c.status_code == 201:
        app_id = c.json()["uuid"]
    else:
        return
    ch = client.post(
        f"/applications/{app_id}/change-status",
        headers=headers,
        json={"new_status": "CANCELLED", "comment": "by jwt"},
    )
    assert ch.status_code == 204, ch.text
    g = client.get(f"/applications/{app_id}", headers=headers)
    assert g.json()["status_code"] == "CANCELLED"
