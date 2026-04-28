import hashlib
import logging
import uuid as uuid_pkg
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.deps import RequestAuth, get_request_auth, require_non_empty_role_or_token
from app.db.session import get_db
from app.models.files import FileRecord
from app.schemas.files import FileRecordListItem, FileRecordOut
from app.services.storage import get_storage
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["files"])


@router.get("", response_model=list[FileRecordListItem])
def list_files_for_entity(
    entity_type: str = Query(..., max_length=100),
    entity_uuid: UUID = Query(..., description="Entity UUID, e.g. application"),
    db: Session = Depends(get_db),
    _: None = Depends(require_non_empty_role_or_token),
) -> list[FileRecord]:
    return list(
        db.scalars(
            select(FileRecord)
            .where(
                and_(FileRecord.entity_type == entity_type, FileRecord.entity_uuid == entity_uuid)
            )
            .order_by(FileRecord.created_at.desc())
        ).all()
    )


@router.post("", response_model=FileRecordOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    entity_type: str = Form(..., max_length=100),
    entity_uuid: UUID = Form(...),
    file_type: str = Form(..., max_length=50),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    auth: RequestAuth = Depends(get_request_auth),
) -> FileRecord:
    if auth.account is None and not auth.roles:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="roles_required")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="empty_file")

    created_by = auth.account.uuid if auth.account is not None else None

    checksum = hashlib.sha256(data).hexdigest()
    safe_name = (file.filename or "upload").replace("\\", "_").replace("/", "_")
    relative_key = f"{entity_type}/{entity_uuid}/{uuid_pkg.uuid4()}_{safe_name}"
    storage_path = get_storage().save(relative_key, data, file.content_type or "application/octet-stream")

    record = FileRecord(
        entity_type=entity_type,
        entity_uuid=entity_uuid,
        file_type=file_type,
        file_name=safe_name,
        storage_path=storage_path,
        mime_type=file.content_type or "application/octet-stream",
        checksum=checksum,
        size_bytes=len(data),
        created_by=created_by,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    try:
        celery_app.send_task(
            "app.worker.tasks.notifications.send_email",
            kwargs={"notification_payload": {"kind": "file_uploaded", "file_uuid": str(record.uuid)}},
        )
    except Exception:
        logger.exception("notification_enqueue_failed")

    return record


@router.get("/{file_uuid}/download", response_class=Response)
def download_file(
    file_uuid: UUID,
    db: Session = Depends(get_db),
    auth: RequestAuth = Depends(get_request_auth),
) -> Response:
    if auth.account is None and not auth.roles:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="roles_required")
    record = db.get(FileRecord, file_uuid)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="file_not_found")
    data = get_storage().read(record.storage_path)
    safe = record.file_name.replace("\r", "").replace("\n", "")
    return Response(
        content=data,
        media_type=record.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{safe}"'},
    )
