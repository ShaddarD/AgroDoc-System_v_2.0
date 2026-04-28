"""drop owner counterparty from terminals

Revision ID: 20260428_0006
Revises: 20260428_0005
Create Date: 2026-04-28
"""

from alembic import op

revision = "20260428_0006"
down_revision = "20260428_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE terminals
        DROP COLUMN IF EXISTS owner_counterparty_uuid;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE terminals
        ADD COLUMN IF NOT EXISTS owner_counterparty_uuid UUID NULL
        REFERENCES counterparties(uuid) ON DELETE SET NULL;
        """
    )
