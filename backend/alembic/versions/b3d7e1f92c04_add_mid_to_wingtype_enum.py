"""add mid to wingtype enum

Revision ID: b3d7e1f92c04
Revises: e7d2c9f41a83
Create Date: 2026-04-18 21:00:00.000000

"""
from alembic import op

revision: str = 'b3d7e1f92c04'
down_revision = 'e7d2c9f41a83'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ALTER TYPE ADD VALUE cannot run inside a transaction in older Postgres.
    # AUTOCOMMIT mode bypasses the transaction wrapper for this statement only.
    op.execute("ALTER TYPE wingtype ADD VALUE IF NOT EXISTS 'mid'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values once added.
    pass
