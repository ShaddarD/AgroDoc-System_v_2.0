from typing import Protocol


class StorageBackend(Protocol):
    def save(self, relative_key: str, data: bytes, content_type: str) -> str:
        """Persist bytes; return a storage key or URI used by get_storage + DB."""

    def read(self, storage_path: str) -> bytes: ...
