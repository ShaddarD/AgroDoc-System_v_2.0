import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.models.account import Account
from app.models.auth_refresh_session import AuthRefreshSession


def revoke_all_refresh_sessions(db: Session, account_uuid: uuid.UUID) -> None:
    now = datetime.now(UTC)
    db.execute(
        update(AuthRefreshSession)
        .where(
            AuthRefreshSession.account_uuid == account_uuid,
            AuthRefreshSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )


def issue_token_pair(db: Session, account: Account) -> dict[str, Any]:
    """Create DB-backed refresh session and return access + refresh JWTs (caller commits)."""
    jti = uuid.uuid4()
    refresh_delta = timedelta(days=settings.refresh_token_expire_days)
    access_delta = timedelta(minutes=settings.access_token_expire_minutes)
    expires_at = datetime.now(UTC) + refresh_delta
    db.add(AuthRefreshSession(jti=jti, account_uuid=account.uuid, expires_at=expires_at))
    db.flush()
    refresh = create_refresh_token(
        secret=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
        subject=account.uuid,
        role_code=account.role_code,
        expires_delta=refresh_delta,
        jti=jti,
    )
    access = create_access_token(
        secret=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
        subject=account.uuid,
        role_code=account.role_code,
        expires_delta=access_delta,
    )
    return {
        "access_token": access,
        "refresh_token": refresh,
        "expires_in": int(access_delta.total_seconds()),
        "refresh_expires_in": int(refresh_delta.total_seconds()),
        "account": account,
    }
