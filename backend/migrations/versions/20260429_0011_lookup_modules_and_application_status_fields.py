"""add per-lookup modules and application status fields

Revision ID: 20260429_0011
Revises: 20260428_0010
Create Date: 2026-04-29
"""

from alembic import op

revision = "20260429_0011"
down_revision = "20260428_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO lookup_access_modules (module_code, description, sort_order) VALUES
          ('lookups_counterparties', 'Справочник: Контрагенты', 201),
          ('lookups_shipping_lines', 'Справочник: Линии перевозки', 202),
          ('lookups_products', 'Справочник: Продукты', 203),
          ('lookups_terminals', 'Справочник: Терминалы', 204),
          ('lookups_powers_of_attorney', 'Справочник: Доверенности', 205)
        ON CONFLICT (module_code) DO NOTHING;

        INSERT INTO account_module_access (account_uuid, module_code, can_read, can_write)
        SELECT ama.account_uuid, lm.module_code, ama.can_read, ama.can_write
        FROM account_module_access ama
        CROSS JOIN (
          SELECT module_code
          FROM lookup_access_modules
          WHERE module_code IN (
            'lookups_counterparties',
            'lookups_shipping_lines',
            'lookups_products',
            'lookups_terminals',
            'lookups_powers_of_attorney'
          )
        ) lm
        WHERE ama.module_code = 'lookups'
        ON CONFLICT (account_uuid, module_code) DO NOTHING;

        INSERT INTO lookup_status_codes (status_code, description) VALUES
          ('DRAFT', 'Черновик'),
          ('SUBMITTED', 'Подано'),
          ('RELEASED', 'Выпущено')
        ON CONFLICT (status_code) DO NOTHING;

        ALTER TABLE applications ADD COLUMN IF NOT EXISTS exporter_name_ru TEXT NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS importer_name TEXT NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS weight_tons NUMERIC(12,3) NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS fss_number VARCHAR(100) NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS fss_issue_date DATE NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS bill_of_lading_number VARCHAR(100) NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS bill_of_lading_date DATE NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE applications DROP COLUMN IF EXISTS bill_of_lading_date;
        ALTER TABLE applications DROP COLUMN IF EXISTS bill_of_lading_number;
        ALTER TABLE applications DROP COLUMN IF EXISTS fss_issue_date;
        ALTER TABLE applications DROP COLUMN IF EXISTS fss_number;
        ALTER TABLE applications DROP COLUMN IF EXISTS weight_tons;
        ALTER TABLE applications DROP COLUMN IF EXISTS importer_name;
        ALTER TABLE applications DROP COLUMN IF EXISTS exporter_name_ru;

        DELETE FROM lookup_status_codes WHERE status_code IN ('DRAFT', 'SUBMITTED', 'RELEASED');
        DELETE FROM lookup_access_modules WHERE module_code IN (
          'lookups_counterparties',
          'lookups_shipping_lines',
          'lookups_products',
          'lookups_terminals',
          'lookups_powers_of_attorney'
        );
        """
    )
