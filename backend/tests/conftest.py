import os
from collections.abc import Generator
from unittest.mock import MagicMock

# Auth / JWT must be set before any app import using settings.
os.environ.setdefault("AUTH_BYPASS_HEADERS", "1")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-key-for-ci-please-use-32-chars-mimimum")

import pytest
from fastapi.testclient import TestClient

from app.main import app


HEAD_EXPORT = {"X-User-Roles": "export_manager"}
HEAD_ADMIN = {"X-User-Roles": "admin"}


@pytest.fixture(autouse=True)
def _silence_celery(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid requiring RabbitMQ during API tests."""
    import app.worker.tasks.events as events_tasks

    fake_task = MagicMock()
    fake_task.delay = MagicMock(return_value=None)
    monkeypatch.setattr(events_tasks, "process_domain_event_task", fake_task)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
