from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_non_empty_role_or_token
from app.db.session import get_db
from app.models.audit_logs import AuditLog
from app.schemas.history import AuditLogItem

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditLogItem])
def list_audit_logs(
    db: Session = Depends(get_db),
    _: None = Depends(require_non_empty_role_or_token),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    entity_type: str | None = Query(default=None, max_length=100),
) -> list[AuditLog]:
    q = select(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type is not None:
        q = q.where(AuditLog.entity_type == entity_type)
    q = q.offset(offset).limit(limit)
    return list(db.scalars(q).all())
