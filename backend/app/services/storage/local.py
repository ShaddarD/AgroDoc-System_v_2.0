from pathlib import Path

from app.services.storage.base import StorageBackend


class LocalStorageBackend:
    def __init__(self, root: Path) -> None:
        self._root = root
        self._root.mkdir(parents=True, exist_ok=True)

    def save(self, relative_key: str, data: bytes, content_type: str) -> str:
        target = self._root / relative_key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return str(target)

    def read(self, storage_path: str) -> bytes:
        p = Path(storage_path)
        if not p.is_file():
            raise FileNotFoundError(f"file_not_found:{storage_path}")
        return p.read_bytes()
