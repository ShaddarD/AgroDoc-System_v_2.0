import io
import uuid

from fastapi.testclient import TestClient

from tests.conftest import HEAD_EXPORT


def test_create_application_then_change_status(client: TestClient) -> None:
    create = client.post(
        "/applications",
        headers=HEAD_EXPORT,
        json={"source_type": "manual", "payload": {"k": "v"}},
    )
    assert create.status_code == 201
    app_id = create.json()["uuid"]
    assert create.json()["status_code"] == "CREATED"

    get_before = client.get(f"/applications/{app_id}", headers=HEAD_EXPORT)
    assert get_before.status_code == 200
    assert get_before.json()["status_code"] == "CREATED"

    user = str(uuid.uuid4())
    change = client.post(
        f"/applications/{app_id}/change-status",
        headers=HEAD_EXPORT,
        json={
            "new_status": "IN_REVIEW",
            "user_uuid": user,
            "user_roles": ["export_manager"],
            "comment": "test",
        },
    )
    assert change.status_code == 204

    get_after = client.get(f"/applications/{app_id}", headers=HEAD_EXPORT)
    assert get_after.status_code == 200
    assert get_after.json()["status_code"] == "IN_REVIEW"

    revs = client.get(f"/applications/{app_id}/revisions", headers=HEAD_EXPORT)
    assert revs.status_code == 200
    rj = revs.json()
    assert rj["total"] == 1
    assert len(rj["items"]) == 1

    audit = client.get(f"/applications/{app_id}/audit-logs", headers=HEAD_EXPORT)
    assert audit.status_code == 200
    aj = audit.json()
    assert any(row.get("action") == "application_create" for row in aj["items"])


def test_change_status_forbidden_for_viewer(client: TestClient) -> None:
    create = client.post(
        "/applications",
        headers=HEAD_EXPORT,
        json={"source_type": "terminal", "payload": {}},
    )
    assert create.status_code == 201
    app_id = create.json()["uuid"]

    response = client.post(
        f"/applications/{app_id}/change-status",
        headers={"X-User-Roles": "viewer"},
        json={
            "new_status": "IN_REVIEW",
            "user_uuid": str(uuid.uuid4()),
            "user_roles": ["viewer"],
            "comment": None,
        },
    )
    assert response.status_code == 403


def test_get_application_not_found(client: TestClient) -> None:
    missing = uuid.uuid4()
    response = client.get(f"/applications/{missing}", headers=HEAD_EXPORT)
    assert response.status_code == 404


def test_get_application_unauthorized_without_role_header(client: TestClient) -> None:
    r = client.get(f"/applications/{uuid.uuid4()}")
    assert r.status_code == 401


def test_list_applications_paginated(client: TestClient) -> None:
    r = client.get("/applications", headers=HEAD_EXPORT, params={"page": 1, "page_size": 5})
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["page_size"] == 5


def test_file_upload_and_download(client: TestClient) -> None:
    app_r = client.post(
        "/applications", headers=HEAD_EXPORT, json={"source_type": "manual", "payload": {}}
    )
    assert app_r.status_code == 201
    app_id = app_r.json()["uuid"]
    up = client.post(
        "/files",
        headers=HEAD_EXPORT,
        data={"entity_type": "application", "entity_uuid": str(app_id), "file_type": "attach"},
        files={"file": ("f.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert up.status_code == 201
    fid = up.json()["uuid"]
    dl = client.get(f"/files/{fid}/download", headers=HEAD_EXPORT)
    assert dl.status_code == 200
    assert dl.content == b"hello"
