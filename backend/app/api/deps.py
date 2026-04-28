import uuid
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models.account import Account


@dataclass
class RequestAuth:
    account: Account | None
    roles: list[str]


def parse_roles_header(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def require_admin_roles(roles: list[str]) -> None:
    if "admin" not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_role_required")


def _bearer_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    return auth[7:].strip() or None


def get_request_auth(
    request: Request,
    db: Session = Depends(get_db),
    x_user_roles: Annotated[str | None, Header(alias="X-User-Roles")] = None,
    x_account_uuid: Annotated[str | None, Header(alias="X-Account-UUID")] = None,
) -> RequestAuth:
    token = _bearer_token(request)
    if token:
        try:
            payload = decode_token(
                token, secret=settings.jwt_secret_key, algorithm=settings.jwt_algorithm
            )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_or_expired_token"
            ) from None
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="token_missing_sub")
        try:
            acc_id = uuid.UUID(str(sub))
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="token_invalid_subject"
            ) from e
        if payload.get("typ") == "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="use_access_token_not_refresh"
            )
        account = db.get(Account, acc_id)
        if account is None or not account.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="account_inactive")
        return RequestAuth(account=account, roles=[account.role_code])

    if settings.auth_bypass_headers:
        roles = parse_roles_header(x_user_roles)
        account: Account | None = None
        if x_account_uuid:
            try:
                aid = uuid.UUID(x_account_uuid)
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_x_account_uuid"
                ) from e
            account = db.get(Account, aid)
        return RequestAuth(account=account, roles=roles)

    return RequestAuth(account=None, roles=[])


def get_request_roles(
    ctx: RequestAuth = Depends(get_request_auth),
) -> list[str]:
    return ctx.roles


def get_current_account(
    ctx: RequestAuth = Depends(get_request_auth),
) -> Account:
    if ctx.account is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication_required")
    return ctx.account


def get_current_account_optional(
    ctx: RequestAuth = Depends(get_request_auth),
) -> Account | None:
    return ctx.account


def require_non_empty_role_or_token(
    ctx: RequestAuth = Depends(get_request_auth),
) -> None:
    """Enforce at least one role: JWT (account) or X-User-Roles when bypass is on."""
    if ctx.account is not None:
        return
    if ctx.roles:
        return
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="roles_or_bearer_token_required"
    )
