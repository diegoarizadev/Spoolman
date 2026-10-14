"""add_printer_name.

Adds an optional name (alias) to the printer table, to tell apart several printers
of the same model.

Revision ID: e6f1b4a82d09
Revises: d5e08a3f7c12
Create Date: 2026-10-14 15:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e6f1b4a82d09'
down_revision = 'd5e08a3f7c12'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    with op.batch_alter_table('printer') as batch_op:
        batch_op.add_column(sa.Column('name', sa.String(length=64), nullable=True))


def downgrade() -> None:
    """Perform the downgrade."""
    with op.batch_alter_table('printer') as batch_op:
        batch_op.drop_column('name')
