"""add door_wall to hangars

Revision ID: a1c4d7e89f20
Revises: b3d7e1f92c04
Create Date: 2026-04-18

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1c4d7e89f20'
down_revision = 'b3d7e1f92c04'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('hangars', sa.Column('door_wall', sa.String(), nullable=False, server_default='south'))


def downgrade():
    op.drop_column('hangars', 'door_wall')
