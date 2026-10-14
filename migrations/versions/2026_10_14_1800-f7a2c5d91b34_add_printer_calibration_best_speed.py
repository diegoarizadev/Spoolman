"""add_printer_calibration_best_speed.

Adds vfa_speed_best (mm/s) to the printer_calibration table: the speed chosen as the
best for print quality, next to the problematic min/max range.

Revision ID: f7a2c5d91b34
Revises: e6f1b4a82d09
Create Date: 2026-10-14 18:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f7a2c5d91b34'
down_revision = 'e6f1b4a82d09'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    with op.batch_alter_table('printer_calibration') as batch_op:
        batch_op.add_column(sa.Column('vfa_speed_best', sa.Float(), nullable=True))


def downgrade() -> None:
    """Perform the downgrade."""
    with op.batch_alter_table('printer_calibration') as batch_op:
        batch_op.drop_column('vfa_speed_best')
