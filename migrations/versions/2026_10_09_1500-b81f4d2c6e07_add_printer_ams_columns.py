"""add_printer_ams_columns.

Adds ams_location (spool location linked to the printer's AMS) and ams_slot_order
(JSON list of spool IDs in slot order) to the printer table.

Revision ID: b81f4d2c6e07
Revises: a7c3e5b91d24
Create Date: 2026-10-09 15:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b81f4d2c6e07'
down_revision = 'a7c3e5b91d24'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    with op.batch_alter_table('printer') as batch_op:
        batch_op.add_column(sa.Column('ams_location', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('ams_slot_order', sa.String(length=1024), nullable=True))


def downgrade() -> None:
    """Perform the downgrade."""
    with op.batch_alter_table('printer') as batch_op:
        batch_op.drop_column('ams_slot_order')
        batch_op.drop_column('ams_location')
