"""convert shape column from enum to varchar

Revision ID: c7a1e4b82d39
Revises: f9b3c2d10e51
Create Date: 2026-04-23

"""
from alembic import op
import sqlalchemy as sa

revision = 'c7a1e4b82d39'
down_revision = 'f9b3c2d10e51'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        'hangars', 'shape',
        type_=sa.String(),
        postgresql_using='shape::text',
        server_default='rectangular',
    )
    op.execute("DROP TYPE IF EXISTS hangarshape")


def downgrade():
    op.execute("CREATE TYPE hangarshape AS ENUM ('rectangular', 't-shaped')")
    op.alter_column(
        'hangars', 'shape',
        type_=sa.Enum('rectangular', 't-shaped', name='hangarshape'),
        postgresql_using="shape::hangarshape",
        server_default='rectangular',
    )
