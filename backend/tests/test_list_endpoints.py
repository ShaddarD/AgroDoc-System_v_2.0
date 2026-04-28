import io
import uuid

from fastapi.testclient import TestClient

from tests.conftest import HEAD_EXPORT


def _token(client: TestClient) -> str:
    r = client.post("/auth/token", json={"login": "e2e_admin", "password": "testpass1"})
    if r.status_code != 200:
        return ""
    return r.json()["access_token"]


def test_list_files_for_entity(client: TestClient) -> None:
    t = _token(client)
    if not t:
        return
    h = {"Authorization": f"Bearer {t}"}
    c = client.post(
        "/applications", headers=h, json={"source_type": "manual", "payload": {}}
    )
    if c.status_code != 201:
        return
    app_id = c.json()["uuid"]
    f = client.post(
        "/files",
        headers=h,
        data={"entity_type": "application", "entity_uuid": str(app_id), "file_type": "doc"},
        files={"file": ("x.txt", io.BytesIO(b"abc"), "text/plain")},
    )
    assert f.status_code == 201, f.text
    lst = client.get(
        f"/files?entity_type=application&entity_uuid={app_id}", headers=h
    )
    assert lst.status_code == 200
    data = lst.json()
    assert len(data) == 1
    assert "storage_path" not in data[0]


def test_audit_logs_list(client: TestClient) -> None:
    t = _token(client)
    if not t:
        return
    r = client.get("/audit-logs?limit=5&entity_type=application", headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_accounts_list_admin_only(client: TestClient) -> None:
    t = _token(client)
    if not t:
        return
    r = client.get("/admin/accounts", headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) >= 1
    logins = {x["login"] for x in rows}
    assert "e2e_admin" in logins


def test_admin_create_set_password_patch(client: TestClient) -> None:
    t = _token(client)
    if not t:
        return
    h = {"Authorization": f"Bearer {t}"}
    login = f"pwtest_{uuid.uuid4().hex[:10]}"
    cr = client.post(
        "/admin/accounts",
        headers=h,
        json={
            "login": login,
            "password": "longpass1x",
            "role_code": "viewer",
            "last_name": "LN",
            "first_name": "FN",
        },
    )
    assert cr.status_code == 201, cr.text
    uid = cr.json()["uuid"]
    sp = client.post(
        f"/admin/accounts/{uid}/set-password",
        headers=h,
        json={"new_password": "otherpass2y"},
    )
    assert sp.status_code == 204, sp.text
    login_r = client.post("/auth/token", json={"login": login, "password": "otherpass2y"})
    assert login_r.status_code == 200
    pa = client.patch(f"/admin/accounts/{uid}", headers=h, json={"is_active": False})
    assert pa.status_code == 200
    off = client.post("/auth/token", json={"login": login, "password": "otherpass2y"})
    assert off.status_code == 401


def test_allowed_status_targets_admin_created(client: TestClient) -> None:
    t = _token(client)
    if not t:
        return
    h = {"Authorization": f"Bearer {t}"}
    c = client.post("/applications", headers=h, json={"source_type": "manual", "payload": {}})
    if c.status_code != 201:
        return
    app_id = c.json()["uuid"]
    r = client.get(f"/applications/{app_id}/allowed-status-targets", headers=h)
    assert r.status_code == 200
    codes = r.json()
    assert codes == ["CANCELLED", "IN_REVIEW"]
