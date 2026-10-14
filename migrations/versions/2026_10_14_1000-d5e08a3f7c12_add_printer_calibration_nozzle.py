"""add_printer_calibration_nozzle.

Adds nozzle_size (mm) to the printer_calibration table, so a VFA test records which
nozzle it was run with.

Revision ID: d5e08a3f7c12
Revises: c4d92e17a5b3
Create Date: 2026-10-14 10:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'd5e08a3f7c12'
down_revision = 'c4d92e17a5b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    with op.batch_alter_table('printer_calibration') as batch_op:
        batch_op.add_column(sa.Column('nozzle_size', sa.Float(), nullable=True))


def downgrade() -> None:
    """Perform the downgrade."""
    with op.batch_alter_table('printer_calibration') as batch_op:
        batch_op.drop_column('nozzle_size')
