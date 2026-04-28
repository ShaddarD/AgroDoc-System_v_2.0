"""add account module access matrix

Revision ID: 20260428_0008
Revises: 20260428_0007
Create Date: 2026-04-28
"""

from alembic import op

revision = "20260428_0008"
down_revision = "20260428_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS lookup_access_modules (
          module_code VARCHAR(100) PRIMARY KEY,
          description VARCHAR(255) NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );

        INSERT INTO lookup_access_modules (module_code, description, sort_order) VALUES
          ('applications', 'Заявки', 10),
          ('lookups', 'Справочники', 20),
          ('users', 'Пользователи', 30),
          ('files', 'Файлы', 40),
          ('profile', 'Профиль', 50)
        ON CONFLICT (module_code) DO NOTHING;

        CREATE TABLE IF NOT EXISTS account_module_access (
          uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          account_uuid UUID NOT NULL REFERENCES accounts(uuid) ON DELETE CASCADE,
          module_code VARCHAR(100) NOT NULL REFERENCES lookup_access_modules(module_code) ON DELETE CASCADE,
          can_read BOOLEAN NOT NULL DEFAULT true,
          can_write BOOLEAN NOT NULL DEFAULT false,
          CONSTRAINT uq_account_module_access UNIQUE (account_uuid, module_code)
        );
        CREATE INDEX IF NOT EXISTS ix_account_module_access_account ON account_module_access (account_uuid);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS account_module_access;
        DROP TABLE IF EXISTS lookup_access_modules;
        """
    )
