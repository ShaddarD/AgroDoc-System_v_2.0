"""refresh session tracking for server-side revoke

Revision ID: 20260428_0004
Revises: 20260428_0003
Create Date: 2026-04-28
"""

from alembic import op

revision = "20260428_0004"
down_revision = "20260428_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS auth_refresh_sessions (
          jti UUID PRIMARY KEY,
          account_uuid UUID NOT NULL REFERENCES accounts(uuid) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_auth_refresh_sessions_account_uuid
          ON auth_refresh_sessions (account_uuid);
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS auth_refresh_sessions")
