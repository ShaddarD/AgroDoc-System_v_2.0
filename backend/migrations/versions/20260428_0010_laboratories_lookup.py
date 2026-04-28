"""add laboratories lookup and application relation

Revision ID: 20260428_0010
Revises: 20260428_0009
Create Date: 2026-04-28
"""

from alembic import op

revision = "20260428_0010"
down_revision = "20260428_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS lookup_laboratories (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lab_rus VARCHAR(255) NOT NULL,
          lab_eng VARCHAR(255) NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE
        );

        INSERT INTO lookup_laboratories (lab_rus, lab_eng, is_active)
        SELECT 'ВНИИКР', 'VNIIKR', TRUE
        WHERE NOT EXISTS (SELECT 1 FROM lookup_laboratories WHERE lab_rus = 'ВНИИКР');

        INSERT INTO lookup_laboratories (lab_rus, lab_eng, is_active)
        SELECT 'Россельхознадзор', 'Rosselkhoznadzor', TRUE
        WHERE NOT EXISTS (SELECT 1 FROM lookup_laboratories WHERE lab_rus = 'Россельхознадзор');

        ALTER TABLE applications
          ADD COLUMN IF NOT EXISTS laboratory_uuid UUID NULL REFERENCES lookup_laboratories(uuid);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE applications DROP COLUMN IF EXISTS laboratory_uuid;
        DROP TABLE IF EXISTS lookup_laboratories;
        """
    )
