"""seed e2e and CI test admin user

Revision ID: 20260428_0003
Revises: 20260428_0002
Create Date: 2026-04-28
"""

import bcrypt
import sqlalchemy as sa
from alembic import op

revision = "20260428_0003"
down_revision = "20260428_0002"
branch_labels = None
depends_on = None

E2E_ADMIN_UUID = "a0000000-0000-0000-0000-0000000e2e01"


def upgrade() -> None:
    conn = op.get_bind()
    row = conn.execute(
        sa.text("SELECT 1 FROM accounts WHERE login = :l LIMIT 1"), {"l": "e2e_admin"}
    ).first()
    if row:
        return
    ph = bcrypt.hashpw(b"testpass1", bcrypt.gensalt(12)).decode("utf-8")
    conn.execute(
        sa.text(
            """
            INSERT INTO accounts (uuid, login, password_hash, role_code, last_name, first_name, is_active)
            VALUES (CAST(:u AS uuid), :login, :ph, 'admin', 'Admin', 'E2E', true)
            """
        ),
        {"u": E2E_ADMIN_UUID, "login": "e2e_admin", "ph": ph},
    )


def downgrade() -> None:
    op.execute("DELETE FROM accounts WHERE login = 'e2e_admin'")
