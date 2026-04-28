"""lookup tables, accounts, counterparties, references, applications columns

Revision ID: 20260428_0002
Revises: 20260427_0001
Create Date: 2026-04-28
"""

from alembic import op


revision = "20260428_0002"
down_revision = "20260427_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS lookup_role_codes (
          role_code VARCHAR(50) PRIMARY KEY,
          description VARCHAR(255) NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS lookup_status_codes (
          status_code VARCHAR(50) PRIMARY KEY,
          description VARCHAR(255) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lookup_source_types (
          code VARCHAR(50) PRIMARY KEY,
          description VARCHAR(255) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lookup_file_types (
          code VARCHAR(50) PRIMARY KEY,
          description VARCHAR(255) NOT NULL
        );

        INSERT INTO lookup_role_codes (role_code, description, sort_order) VALUES
          ('admin', 'Full access', 10),
          ('export_manager', 'Stuffing registry and exports', 20),
          ('certification_manager', 'Applications and documents', 30),
          ('terminal_operator', 'Containers and registry', 40),
          ('department_user', 'Department-scoped applications', 50),
          ('accounting_manager', 'Document registry read', 60),
          ('viewer', 'Read-only', 70)
        ON CONFLICT (role_code) DO NOTHING;

        INSERT INTO lookup_status_codes (status_code, description) VALUES
          ('CREATED', 'Created'),
          ('IN_REVIEW', 'In review'),
          ('APPROVED', 'Approved'),
          ('REJECTED', 'Rejected'),
          ('REQUEST_CREATED', 'Request created'),
          ('COMPLETED', 'Completed'),
          ('CANCELLED', 'Cancelled'),
          ('CANCELLED_FORCED', 'Cancelled by admin'),
          ('REOPENED', 'Reopened by admin')
        ON CONFLICT (status_code) DO NOTHING;

        INSERT INTO lookup_source_types (code, description) VALUES
          ('manual', 'Manual input'),
          ('terminal', 'Terminal'),
          ('import', 'Import'),
          ('module', 'Other module')
        ON CONFLICT (code) DO NOTHING;

        INSERT INTO lookup_file_types (code, description) VALUES
          ('application_attachment', 'Application attachment'),
          ('generated_word', 'Generated Word'),
          ('generated_excel', 'Generated Excel'),
          ('generated_pdf', 'Generated PDF'),
          ('email', 'Email artifact')
        ON CONFLICT (code) DO NOTHING;

        CREATE TABLE IF NOT EXISTS counterparties (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name_ru VARCHAR(255) NOT NULL,
          name_en VARCHAR(255) NULL,
          inn VARCHAR(12) NULL,
          kpp VARCHAR(9) NULL,
          ogrn VARCHAR(15) NULL,
          legal_address_ru TEXT NULL,
          actual_address_ru TEXT NULL,
          legal_address_en TEXT NULL,
          actual_address_en TEXT NULL,
          status_code VARCHAR(50) NOT NULL DEFAULT 'active',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS accounts (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          login VARCHAR(100) NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role_code VARCHAR(50) NOT NULL REFERENCES lookup_role_codes(role_code),
          last_name VARCHAR(100) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          middle_name VARCHAR(100) NULL,
          counterparty_uuid UUID NULL REFERENCES counterparties(uuid),
          phone VARCHAR(32) NULL,
          email VARCHAR(255) NULL,
          job_title VARCHAR(150) NULL,
          department_code VARCHAR(50) NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts (role_code);
        CREATE INDEX IF NOT EXISTS idx_accounts_counterparty ON accounts (counterparty_uuid);

        CREATE TABLE IF NOT EXISTS shipping_lines (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(20) NOT NULL UNIQUE,
          name_ru VARCHAR(255) NOT NULL,
          name_en VARCHAR(255) NOT NULL DEFAULT '',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS products (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_code VARCHAR(50) NOT NULL UNIQUE,
          hs_code_tnved VARCHAR(20) NOT NULL,
          product_name_ru VARCHAR(255) NOT NULL,
          product_name_en VARCHAR(255) NULL,
          botanical_name_latin VARCHAR(255) NULL,
          regulatory_documents TEXT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS terminals (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          terminal_code VARCHAR(50) NOT NULL UNIQUE,
          terminal_name VARCHAR(255) NOT NULL,
          owner_counterparty_uuid UUID NULL REFERENCES counterparties(uuid) ON DELETE SET NULL,
          address_ru TEXT NOT NULL,
          address_en TEXT NULL,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS powers_of_attorney (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          poa_number VARCHAR(100) NOT NULL,
          issue_date DATE NOT NULL,
          validity_years INTEGER NOT NULL,
          expiry_date DATE GENERATED ALWAYS AS ((issue_date + (validity_years * interval '1 year'))::date) STORED,
          principal_counterparty_uuid UUID NULL REFERENCES counterparties(uuid) ON DELETE RESTRICT,
          attorney_counterparty_uuid UUID NULL REFERENCES counterparties(uuid) ON DELETE RESTRICT,
          status_code VARCHAR(50) NOT NULL DEFAULT 'active',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS akt_zatarki (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          act_number VARCHAR(50) NOT NULL,
          act_date DATE NOT NULL,
          product_name_ru TEXT NULL,
          counterparty_uuid UUID NOT NULL REFERENCES counterparties(uuid),
          source VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          application_uuid UUID NULL REFERENCES applications(uuid) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_akt_application ON akt_zatarki (application_uuid);

        ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_number VARCHAR(100) NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_type_code VARCHAR(50) NOT NULL DEFAULT 'vnikkr';
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS source_uuid UUID NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_counterparty_uuid UUID NULL REFERENCES counterparties(uuid);
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS applicant_account_uuid UUID NULL REFERENCES accounts(uuid);
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS assigned_to UUID NULL REFERENCES accounts(uuid);
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS terminal_uuid UUID NULL REFERENCES terminals(uuid);
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS product_uuid UUID NULL REFERENCES products(uuid);
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS power_of_attorney_uuid UUID NULL REFERENCES powers_of_attorney(uuid);
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS stuffing_act_uuid UUID NULL REFERENCES akt_zatarki(uuid);
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS master_application_uuid UUID NULL REFERENCES applications(uuid);
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS containers_snapshot TEXT NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS container_count_snapshot INTEGER NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS cargo_places_snapshot TEXT NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS places_snapshot INTEGER NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS notes TEXT NULL;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS uq_applications_application_number
          ON applications (application_number) WHERE application_number IS NOT NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS uq_applications_application_number;

        ALTER TABLE applications DROP COLUMN IF EXISTS submitted_at;
        ALTER TABLE applications DROP COLUMN IF EXISTS is_active;
        ALTER TABLE applications DROP COLUMN IF EXISTS notes;
        ALTER TABLE applications DROP COLUMN IF EXISTS places_snapshot;
        ALTER TABLE applications DROP COLUMN IF EXISTS cargo_places_snapshot;
        ALTER TABLE applications DROP COLUMN IF EXISTS container_count_snapshot;
        ALTER TABLE applications DROP COLUMN IF EXISTS containers_snapshot;
        ALTER TABLE applications DROP COLUMN IF EXISTS master_application_uuid;
        ALTER TABLE applications DROP COLUMN IF EXISTS stuffing_act_uuid;
        ALTER TABLE applications DROP COLUMN IF EXISTS power_of_attorney_uuid;
        ALTER TABLE applications DROP COLUMN IF EXISTS product_uuid;
        ALTER TABLE applications DROP COLUMN IF EXISTS terminal_uuid;
        ALTER TABLE applications DROP COLUMN IF EXISTS assigned_to;
        ALTER TABLE applications DROP COLUMN IF EXISTS applicant_account_uuid;
        ALTER TABLE applications DROP COLUMN IF EXISTS applicant_counterparty_uuid;
        ALTER TABLE applications DROP COLUMN IF EXISTS source_uuid;
        ALTER TABLE applications DROP COLUMN IF EXISTS application_type_code;
        ALTER TABLE applications DROP COLUMN IF EXISTS application_number;

        DROP TABLE IF EXISTS akt_zatarki;
        DROP TABLE IF EXISTS powers_of_attorney;
        DROP TABLE IF EXISTS terminals;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS shipping_lines;
        DROP TABLE IF EXISTS accounts;
        DROP TABLE IF EXISTS counterparties;
        DROP TABLE IF EXISTS lookup_file_types;
        DROP TABLE IF EXISTS lookup_source_types;
        DROP TABLE IF EXISTS lookup_status_codes;
        DROP TABLE IF EXISTS lookup_role_codes;
        """
    )
