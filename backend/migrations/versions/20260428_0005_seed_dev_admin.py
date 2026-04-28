"""optional dev/test account login admin / password admin (not for production)

Revision ID: 20260428_0005
Revises: 20260428_0004
Create Date: 2026-04-28
"""

import bcrypt
import sqlalchemy as sa
from alembic import op

revision = "20260428_0005"
down_revision = "20260428_0004"
branch_labels = None
depends_on = None

# Fixed UUID for predictable foreign keys in local scripts (do not use in production DB)
DEV_ADMIN_UUID = "a0000000-0000-0000-0000-0000000ad001"


def upgrade() -> None:
    conn = op.get_bind()
    row = conn.execute(
        sa.text("SELECT 1 FROM accounts WHERE login = :l LIMIT 1"), {"l": "admin"}
    ).first()
    if row:
        return
    ph = bcrypt.hashpw(b"admin", bcrypt.gensalt(12)).decode("utf-8")
    conn.execute(
        sa.text(
            """
            INSERT INTO accounts (uuid, login, password_hash, role_code, last_name, first_name, is_active)
            VALUES (CAST(:u AS uuid), :login, :ph, 'admin', 'Admin', 'Dev', true)
            """
        ),
        {"u": DEV_ADMIN_UUID, "login": "admin", "ph": ph},
    )


def downgrade() -> None:
    op.execute("DELETE FROM accounts WHERE login = 'admin'")
