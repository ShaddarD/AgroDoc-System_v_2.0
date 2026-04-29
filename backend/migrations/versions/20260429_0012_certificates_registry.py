"""add certificates registry table

Revision ID: 20260429_0012
Revises: 20260429_0011
Create Date: 2026-04-29
"""

from alembic import op

revision = "20260429_0012"
down_revision = "20260429_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO lookup_access_modules (module_code, description, sort_order) VALUES
          ('registry_certificates', 'Реестр сертификатов', 25)
        ON CONFLICT (module_code) DO NOTHING;

        INSERT INTO account_module_access (account_uuid, module_code, can_read, can_write)
        SELECT ama.account_uuid, 'registry_certificates', ama.can_read, ama.can_write
        FROM account_module_access ama
        WHERE ama.module_code = 'applications'
        ON CONFLICT (account_uuid, module_code) DO NOTHING;

        CREATE TABLE IF NOT EXISTS registry_certificates (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          registry_number VARCHAR(100) NOT NULL UNIQUE,
          application_uuid UUID NULL REFERENCES applications(uuid) ON DELETE SET NULL,
          bl_number VARCHAR(100) NULL,
          bl_date DATE NULL,
          weight_tons NUMERIC(12,3) NULL,
          fss_number VARCHAR(100) NULL,
          fss_issue_date DATE NULL,
          fum TEXT NULL,
          quality_certificate TEXT NULL,
          pi TEXT NULL,
          health TEXT NULL,
          conclusion TEXT NULL,
          radio TEXT NULL,
          non_gmo TEXT NULL,
          soo TEXT NULL,
          wood TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS ix_registry_certificates_application_uuid ON registry_certificates(application_uuid);
        CREATE INDEX IF NOT EXISTS ix_registry_certificates_registry_number ON registry_certificates(registry_number);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS registry_certificates;
        DELETE FROM lookup_access_modules WHERE module_code = 'registry_certificates';
        """
    )
