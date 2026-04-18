"""add logo to orgs

Revision ID: e7d2c9f41a83
Revises: c3f1a8e20b47
Create Date: 2026-04-18 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7d2c9f41a83'
down_revision: Union[str, Sequence[str], None] = 'c3f1a8e20b47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orgs', sa.Column('logo', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('orgs', 'logo')
