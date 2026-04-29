"""add registry ui settings table

Revision ID: 20260429_0014
Revises: 20260429_0012
Create Date: 2026-04-29
"""

from alembic import op

revision = "20260429_0014"
down_revision = "20260429_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS registry_ui_settings (
          setting_key VARCHAR(100) PRIMARY KEY,
          setting_value JSONB NOT NULL DEFAULT '{}'::jsonb
        );
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS registry_ui_settings;
        """
    )
