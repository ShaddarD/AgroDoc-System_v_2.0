from fastapi.testclient import TestClient

from tests.conftest import HEAD_ADMIN


def test_list_roles_contains_admin(client: TestClient) -> None:
    response = client.get("/lookups/roles")
    assert response.status_code == 200
    roles = response.json()
    codes = {row["role_code"] for row in roles}
    assert "admin" in codes
    assert "export_manager" in codes


def test_list_statuses_contains_created(client: TestClient) -> None:
    response = client.get("/lookups/statuses")
    assert response.status_code == 200
    statuses = {row["status_code"] for row in response.json()}
    assert "CREATED" in statuses
    assert "IN_REVIEW" in statuses


def test_create_role_requires_admin_header(client: TestClient) -> None:
    response = client.post(
        "/lookups/roles",
        json={"role_code": "test_role_x", "description": "temporary", "sort_order": 999},
    )
    assert response.status_code == 403


def test_create_role_with_admin_header(client: TestClient) -> None:
    response = client.post(
        "/lookups/roles",
        headers=HEAD_ADMIN,
        json={"role_code": "test_role_ci", "description": "CI temp role", "sort_order": 999},
    )
    if response.status_code == 409:
        return
    assert response.status_code == 201
    body = response.json()
    assert body["role_code"] == "test_role_ci"
