from pathlib import Path

from app.core.config import settings
from app.services.storage.base import StorageBackend
from app.services.storage.local import LocalStorageBackend
from app.services.storage.s3 import S3StorageBackend

_storage: StorageBackend | None = None


def get_storage() -> StorageBackend:
    global _storage
    if _storage is not None:
        return _storage
    backend = (settings.files_storage_backend or "local").lower().strip()
    if backend == "s3":
        if not settings.s3_bucket:
            raise RuntimeError("files_storage_backend=s3 requires s3_bucket")
        _storage = S3StorageBackend(
            bucket=settings.s3_bucket,
            region=settings.s3_region,
            endpoint_url=settings.s3_endpoint_url or None,
        )
    else:
        _storage = LocalStorageBackend(Path(settings.files_storage_root))
    return _storage
