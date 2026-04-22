"""add shape to hangars

Revision ID: f9b3c2d10e51
Revises: a1c4d7e89f20
Create Date: 2026-04-23

"""
from alembic import op
import sqlalchemy as sa

revision = 'f9b3c2d10e51'
down_revision = 'a1c4d7e89f20'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE TYPE hangarshape AS ENUM ('rectangular', 't-shaped')")
    op.add_column(
        'hangars',
        sa.Column('shape', sa.Enum('rectangular', 't-shaped', name='hangarshape'),
                  nullable=False, server_default='rectangular'),
    )


def downgrade():
    op.drop_column('hangars', 'shape')
    op.execute("DROP TYPE hangarshape")
