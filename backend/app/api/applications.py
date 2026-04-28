import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.deps import (
    RequestAuth,
    get_request_auth,
    require_non_empty_role_or_token,
)
from app.db.session import get_db
from app.core.config import settings
from app.models.application_revisions import ApplicationRevision
from app.models.applications import Application
from app.models.audit_logs import AuditLog
from app.models.domain_events import DomainEvent
from app.schemas.applications import (
    ApplicationCreateRequest,
    ApplicationListResponse,
    ApplicationResponse,
    ChangeStatusRequest,
)
from app.schemas.history import (
    AdjacentRevisionsOut,
    ApplicationRevisionItem,
    AuditLogItem,
    AuditPage,
    RevisionPage,
)
from app.services.audit import write_audit
from app.services.workflow import allowed_target_status_codes, change_status

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applications", tags=["applications"])


def _resolve_status_user(
    payload: ChangeStatusRequest, request_auth: RequestAuth
) -> tuple[uuid.UUID, list[str]]:
    if request_auth.account is not None:
        return request_auth.account.uuid, [request_auth.account.role_code]
    if (
        settings.auth_bypass_headers
        and payload.user_uuid is not None
        and payload.user_roles is not None
    ):
        return payload.user_uuid, list(payload.user_roles)
    if not settings.auth_bypass_headers:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="bearer_token_required"
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST, detail="user_uuid_and_user_roles_required",
    )


@router.get("", response_model=ApplicationListResponse)
def list_applications(
    _: None = Depends(require_non_empty_role_or_token),
    db: Session = Depends(get_db),
    status_code: str | None = Query(default=None, max_length=50),
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    conditions = []
    if status_code is not None:
        conditions.append(Application.status_code == status_code)
    if created_from is not None:
        conditions.append(Application.created_at >= created_from)
    if created_to is not None:
        conditions.append(Application.created_at < created_to)

    base = select(Application)
    count_q = select(func.count()).select_from(Application)
    if conditions:
        base = base.where(and_(*conditions))
        count_q = count_q.where(and_(*conditions))

    total = int(db.scalar(count_q) or 0)
    offset = (page - 1) * page_size
    base = base.order_by(Application.created_at.desc()).offset(offset).limit(page_size)
    items = list(db.scalars(base).all())
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get(
    "/{application_uuid}/revisions/adjacent/{version}",
    response_model=AdjacentRevisionsOut,
)
def get_adjacent_revisions(
    application_uuid: uuid.UUID,
    version: int,
    _: None = Depends(require_non_empty_role_or_token),
    db: Session = Depends(get_db),
) -> AdjacentRevisionsOut:
    app = db.get(Application, application_uuid)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="application_not_found")
    current = db.scalars(
        select(ApplicationRevision)
        .where(
            and_(
                ApplicationRevision.application_uuid == application_uuid,
                ApplicationRevision.version == version,
            )
        )
        .limit(1)
    ).first()
    if current is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="revision_not_found")
    previous = None
    if version > 1:
        previous = db.scalars(
            select(ApplicationRevision)
            .where(
                and_(
                    ApplicationRevision.application_uuid == application_uuid,
                    ApplicationRevision.version == version - 1,
                )
            )
            .limit(1)
        ).first()
    return AdjacentRevisionsOut(current=current, previous=previous)


@router.get("/{application_uuid}/revisions", response_model=RevisionPage)
def list_revisions(
    application_uuid: uuid.UUID,
    _: None = Depends(require_non_empty_role_or_token),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    app = db.get(Application, application_uuid)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="application_not_found")
    base = select(ApplicationRevision).where(ApplicationRevision.application_uuid == application_uuid)
    count_q = select(func.count()).select_from(ApplicationRevision).where(
        ApplicationRevision.application_uuid == application_uuid
    )
    total = int(db.scalar(count_q) or 0)
    offset = (page - 1) * page_size
    items = list(
        db.scalars(
            base.order_by(ApplicationRevision.version.desc()).offset(offset).limit(page_size)
        ).all()
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{application_uuid}/audit-logs", response_model=AuditPage)
def list_application_audit(
    application_uuid: uuid.UUID,
    _: None = Depends(require_non_empty_role_or_token),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    app = db.get(Application, application_uuid)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="application_not_found")
    cond = and_(
        AuditLog.entity_type == "application",
        AuditLog.entity_uuid == application_uuid,
    )
    count_q = select(func.count()).select_from(AuditLog).where(cond)
    total = int(db.scalar(count_q) or 0)
    offset = (page - 1) * page_size
    items = list(
        db.scalars(
            select(AuditLog).where(cond).order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
        ).all()
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/{application_uuid}/allowed-status-targets", response_model=list[str])
def list_allowed_status_targets(
    application_uuid: uuid.UUID,
    request_auth: RequestAuth = Depends(get_request_auth),
    _: None = Depends(require_non_empty_role_or_token),
    db: Session = Depends(get_db),
) -> list[str]:
    application = db.get(Application, application_uuid)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="application_not_found")
    roles = _roles_for_workflow(request_auth)
    return allowed_target_status_codes(application.status_code, roles)


@router.get("/{application_uuid}", response_model=ApplicationResponse)
def get_application(
    application_uuid: uuid.UUID,
    _: None = Depends(require_non_empty_role_or_token),
    db: Session = Depends(get_db),
) -> Application:
    application = db.get(Application, application_uuid)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="application_not_found")
    return application


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreateRequest,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
    _: None = Depends(require_non_empty_role_or_token),
) -> Application:
    created_by = payload.created_by
    if request_auth.account is not None:
        created_by = request_auth.account.uuid

    application = Application(
        source_type=payload.source_type, status_code="CREATED", applicant_account_uuid=created_by
    )
    db.add(application)
    db.flush()

    revision = ApplicationRevision(
        application_uuid=application.uuid,
        version=1,
        data=payload.payload,
        created_by=created_by,
    )
    db.add(revision)
    db.flush()

    application.current_revision_uuid = revision.uuid

    write_audit(
        db,
        account_uuid=created_by,
        action="application_create",
        event_type="CREATE",
        entity_type="application",
        entity_uuid=application.uuid,
        old_data=None,
        new_data={"source_type": payload.source_type, "revision_version": 1},
    )

    domain = DomainEvent(
        event_type="APPLICATION_CREATED",
        entity_type="application",
        entity_uuid=application.uuid,
        payload={"source_type": payload.source_type},
    )
    db.add(domain)
    db.flush()

    event_uuid = domain.uuid
    db.commit()
    db.refresh(application)

    try:
        from app.worker.tasks.events import process_domain_event_task

        process_domain_event_task.delay(str(event_uuid))
    except Exception:
        logger.exception("celery_enqueue_failed_for_application_created")

    return application


@router.post("/{application_uuid}/change-status", status_code=status.HTTP_204_NO_CONTENT)
def change_application_status(
    application_uuid: uuid.UUID,
    payload: ChangeStatusRequest,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
) -> None:
    user_uuid, user_roles = _resolve_status_user(payload, request_auth)
    try:
        change_status(
            db=db,
            application_uuid=application_uuid,
            new_status=payload.new_status,
            user_uuid=user_uuid,
            user_roles=user_roles,
            comment=payload.comment,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/{application_uuid}/revisions", response_model=ApplicationResponse)
def create_revision(
    application_uuid: uuid.UUID,
    payload: ApplicationCreateRequest,
    db: Session = Depends(get_db),
    request_auth: RequestAuth = Depends(get_request_auth),
    _: None = Depends(require_non_empty_role_or_token),
) -> Application:
    application = db.get(Application, application_uuid)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="application_not_found")

    created_by = payload.created_by
    if request_auth.account is not None:
        created_by = request_auth.account.uuid

    current_version = db.scalar(
        select(func.coalesce(func.max(ApplicationRevision.version), 0)).where(
            ApplicationRevision.application_uuid == application_uuid
        )
    )
    next_version = int(current_version) + 1
    revision = ApplicationRevision(
        application_uuid=application_uuid,
        version=next_version,
        data=payload.payload,
        created_by=created_by,
    )
    db.add(revision)
    db.flush()
    application.current_revision_uuid = revision.uuid
    db.commit()
    db.refresh(application)
    return application
