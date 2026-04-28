import uuid as uuid_pkg
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_logs import AuditLog


def write_audit(
    db: Session,
    *,
    account_uuid: uuid_pkg.UUID | None,
    action: str,
    event_type: str,
    entity_type: str,
    entity_uuid: uuid_pkg.UUID,
    old_data: dict[str, Any] | None,
    new_data: dict[str, Any] | None,
) -> None:
    db.add(
        AuditLog(
            account_uuid=account_uuid,
            action=action,
            event_type=event_type,
            entity_type=entity_type,
            entity_uuid=entity_uuid,
            old_data=old_data,
            new_data=new_data,
        )
    )
