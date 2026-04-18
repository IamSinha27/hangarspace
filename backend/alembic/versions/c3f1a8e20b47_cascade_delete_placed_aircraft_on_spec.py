"""cascade delete placed_aircraft when spec deleted

Revision ID: c3f1a8e20b47
Revises: fd2b5b9032dc
Create Date: 2026-04-18 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3f1a8e20b47'
down_revision: Union[str, Sequence[str], None] = 'fd2b5b9032dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('placed_aircraft_spec_id_fkey', 'placed_aircraft', type_='foreignkey')
    op.create_foreign_key(
        'placed_aircraft_spec_id_fkey',
        'placed_aircraft', 'aircraft_specs',
        ['spec_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint('placed_aircraft_spec_id_fkey', 'placed_aircraft', type_='foreignkey')
    op.create_foreign_key(
        'placed_aircraft_spec_id_fkey',
        'placed_aircraft', 'aircraft_specs',
        ['spec_id'], ['id'],
    )
