import mimetypes
from typing import Any

import boto3
from botocore.config import Config as BotoConfig


def _parse_s3_uri(path: str) -> tuple[str, str]:
    if not path.startswith("s3://"):
        raise ValueError("expected_s3_uri")
    rest = path[5:]
    bucket, _, key = rest.partition("/")
    if not bucket or not key:
        raise ValueError("invalid_s3_uri")
    return bucket, key


def _s3_object_uri(bucket: str, key: str) -> str:
    return f"s3://{bucket}/{key}"


class S3StorageBackend:
    def __init__(
        self,
        *,
        bucket: str,
        region: str,
        endpoint_url: str | None,
    ) -> None:
        self._bucket = bucket
        self._client: Any = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url or None,
            config=BotoConfig(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    def save(self, relative_key: str, data: bytes, content_type: str) -> str:
        if not content_type:
            content_type, _ = mimetypes.guess_type(relative_key)
        self._client.put_object(
            Bucket=self._bucket,
            Key=relative_key,
            Body=data,
            ContentType=content_type or "application/octet-stream",
        )
        return _s3_object_uri(self._bucket, relative_key)

    def read(self, storage_path: str) -> bytes:
        bucket, key = _parse_s3_uri(storage_path)
        r = self._client.get_object(Bucket=bucket, Key=key)
        return r["Body"].read()
