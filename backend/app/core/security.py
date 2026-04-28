from datetime import UTC, datetime, timedelta
import uuid
from typing import Any

import bcrypt
from jose import jwt


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(12)).decode("utf-8")


def verify_password(plain: str, password_hash: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(
    *, secret: str, algorithm: str, subject: uuid.UUID, role_code: str, expires_delta: timedelta
) -> str:
    now = datetime.now(UTC)
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "role": role_code,
        "typ": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(to_encode, secret, algorithm=algorithm)


def create_refresh_token(
    *,
    secret: str,
    algorithm: str,
    subject: uuid.UUID,
    role_code: str,
    expires_delta: timedelta,
    jti: uuid.UUID,
) -> str:
    now = datetime.now(UTC)
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "role": role_code,
        "typ": "refresh",
        "jti": str(jti),
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(to_encode, secret, algorithm=algorithm)


def decode_token(token: str, *, secret: str, algorithm: str) -> dict[str, Any]:
    return jwt.decode(token, secret, algorithms=[algorithm])  # type: ignore[no-any-return]
