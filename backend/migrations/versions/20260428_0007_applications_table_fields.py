"""add table mode fields to applications

Revision ID: 20260428_0007
Revises: 20260428_0006
Create Date: 2026-04-28
"""

from alembic import op

revision = "20260428_0007"
down_revision = "20260428_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS izveshenie TEXT NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS notes_in_table TEXT NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS fss_plan_issue_date DATE NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE applications DROP COLUMN IF EXISTS fss_plan_issue_date;
        ALTER TABLE applications DROP COLUMN IF EXISTS notes_in_table;
        ALTER TABLE applications DROP COLUMN IF EXISTS izveshenie;
        """
    )
