"""foundation schema

Revision ID: 20260427_0001
Revises:
Create Date: 2026-04-27
"""

from alembic import op


revision = "20260427_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    sql = """
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS applications (
      uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status_code VARCHAR(50) NOT NULL DEFAULT 'CREATED',
      source_type VARCHAR(50) NOT NULL DEFAULT 'manual',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      current_revision_uuid UUID NULL
    );

    CREATE TABLE IF NOT EXISTS application_revisions (
      uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      application_uuid UUID NOT NULL REFERENCES applications(uuid) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      data JSONB NOT NULL,
      created_by UUID NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (application_uuid, version)
    );

    ALTER TABLE applications
      ADD CONSTRAINT fk_applications_current_revision
      FOREIGN KEY (current_revision_uuid) REFERENCES application_revisions(uuid) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS status_history (
      uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(100) NOT NULL,
      entity_uuid UUID NOT NULL,
      from_status_code VARCHAR(50) NULL,
      to_status_code VARCHAR(50) NOT NULL,
      changed_by UUID NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      comment TEXT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_uuid UUID NULL,
      action VARCHAR(100) NOT NULL,
      event_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_uuid UUID NOT NULL,
      old_data JSONB NULL,
      new_data JSONB NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS files (
      uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(100) NOT NULL,
      entity_uuid UUID NOT NULL,
      file_type VARCHAR(50) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      storage_path VARCHAR(1024) NOT NULL,
      mime_type VARCHAR(255) NOT NULL,
      checksum VARCHAR(64) NULL,
      size_bytes BIGINT NOT NULL,
      created_by UUID NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS domain_events (
      uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_uuid UUID NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_uuid);
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs (created_at);
    CREATE INDEX IF NOT EXISTS idx_status_hist_entity ON status_history (entity_type, entity_uuid);
    CREATE INDEX IF NOT EXISTS idx_status_hist_ts ON status_history (created_at);
    CREATE INDEX IF NOT EXISTS idx_apps_status ON applications (status_code);
    CREATE INDEX IF NOT EXISTS idx_apps_status_ts ON applications (status_code, created_at);
    CREATE INDEX IF NOT EXISTS idx_devents_entity ON domain_events (entity_type, entity_uuid);
    CREATE INDEX IF NOT EXISTS idx_devents_created_at ON domain_events (created_at);

    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        EXECUTE 'REVOKE UPDATE (status_code) ON applications FROM app_user';
      END IF;
    END $$;
    """
    op.execute(sql)


def downgrade() -> None:
    sql = """
    DROP TABLE IF EXISTS domain_events;
    DROP TABLE IF EXISTS files;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS status_history;
    DROP TABLE IF EXISTS application_revisions;
    DROP TABLE IF EXISTS applications;
    """
    op.execute(sql)
