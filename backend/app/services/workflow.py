import logging
import uuid
from collections.abc import Iterable

from sqlalchemy.orm import Session

from app.models.applications import Application
from app.models.audit_logs import AuditLog
from app.models.domain_events import DomainEvent
from app.models.status_history import StatusHistory

logger = logging.getLogger(__name__)


ALLOWED_TRANSITIONS: dict[str, set[tuple[str, str]]] = {
    "terminal_operator": {("CREATED", "CANCELLED")},
    "export_manager": {
        ("CREATED", "IN_REVIEW"),
        ("IN_REVIEW", "APPROVED"),
        ("IN_REVIEW", "REJECTED"),
        ("REJECTED", "IN_REVIEW"),
    },
    "certification_manager": {
        ("APPROVED", "REQUEST_CREATED"),
        ("REQUEST_CREATED", "COMPLETED"),
    },
    "admin": {
        ("CREATED", "CANCELLED"),
        ("CREATED", "IN_REVIEW"),
        ("IN_REVIEW", "APPROVED"),
        ("IN_REVIEW", "REJECTED"),
        ("REJECTED", "IN_REVIEW"),
        ("APPROVED", "REQUEST_CREATED"),
        ("REQUEST_CREATED", "COMPLETED"),
        ("APPROVED", "CANCELLED_FORCED"),
        ("COMPLETED", "REOPENED"),
        ("REOPENED", "IN_REVIEW"),
    },
    "department_user": set(),
    "accounting_manager": set(),
    "viewer": set(),
}


def _is_transition_allowed(role_codes: Iterable[str], from_status: str, to_status: str) -> bool:
    for role_code in role_codes:
        if (from_status, to_status) in ALLOWED_TRANSITIONS.get(role_code, set()):
            return True
    return False


def allowed_target_status_codes(from_status: str, user_roles: Iterable[str]) -> list[str]:
    """Distinct target statuses the given roles may transition to from ``from_status`` (sorted)."""
    targets: set[str] = set()
    for role_code in user_roles:
        for fr, to in ALLOWED_TRANSITIONS.get(role_code, set()):
            if fr == from_status:
                targets.add(to)
    return sorted(targets)


def change_status(
    db: Session,
    application_uuid: uuid.UUID,
    new_status: str,
    user_uuid: uuid.UUID,
    user_roles: list[str],
    comment: str | None = None,
) -> uuid.UUID:
    application = db.get(Application, application_uuid)
    if application is None:
        raise ValueError("application_not_found")

    old_status = application.status_code
    if not _is_transition_allowed(user_roles, old_status, new_status):
        raise PermissionError("transition_not_allowed")

    application.status_code = new_status

    db.add(
        StatusHistory(
            entity_type="application",
            entity_uuid=application_uuid,
            from_status_code=old_status,
            to_status_code=new_status,
            changed_by=user_uuid,
            comment=comment,
        )
    )

    db.add(
        AuditLog(
            account_uuid=user_uuid,
            action="change_status",
            event_type="STATUS_CHANGE",
            entity_type="application",
            entity_uuid=application_uuid,
            old_data={"status_code": old_status},
            new_data={"status_code": new_status, "comment": comment},
        )
    )

    domain = DomainEvent(
        event_type="APPLICATION_STATUS_CHANGED",
        entity_type="application",
        entity_uuid=application_uuid,
        payload={"from": old_status, "to": new_status, "comment": comment},
    )
    db.add(domain)
    db.flush()

    event_uuid = domain.uuid
    db.commit()

    try:
        from app.worker.tasks.events import process_domain_event_task

        process_domain_event_task.delay(str(event_uuid))
    except Exception:
        logger.exception("celery_enqueue_failed_for_domain_event")

    return event_uuid
