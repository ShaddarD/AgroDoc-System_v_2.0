"""add destination fields to applications

Revision ID: 20260428_0009
Revises: 20260428_0008
Create Date: 2026-04-28
"""

from alembic import op

revision = "20260428_0009"
down_revision = "20260428_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS destination_place_ru TEXT NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS destination_place_en TEXT NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE applications DROP COLUMN IF EXISTS destination_place_en;
        ALTER TABLE applications DROP COLUMN IF EXISTS destination_place_ru;
        """
    )
