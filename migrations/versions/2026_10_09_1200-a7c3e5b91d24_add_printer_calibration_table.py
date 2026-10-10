"""add_printer_calibration_table.

Creates the printer_calibration table, one row per VFA (resonance) test
attempt recorded against a printer.

Revision ID: a7c3e5b91d24
Revises: e01386e04703
Create Date: 2026-10-09 12:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a7c3e5b91d24'
down_revision = 'e01386e04703'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    op.create_table('printer_calibration',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('registered', sa.DateTime(), nullable=False),
    sa.Column('printer_id', sa.Integer(), nullable=False),
    sa.Column('vfa_speed_min', sa.Float(), nullable=True),
    sa.Column('vfa_speed_max', sa.Float(), nullable=True),
    sa.Column('image_path', sa.String(length=512), nullable=True),
    sa.Column('notes', sa.String(length=1024), nullable=True),
    sa.ForeignKeyConstraint(['printer_id'], ['printer.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_printer_calibration_printer_id'), 'printer_calibration', ['printer_id'], unique=False)
    op.create_index(op.f('ix_printer_calibration_id'), 'printer_calibration', ['id'], unique=False)


def downgrade() -> None:
    """Perform the downgrade."""
    op.drop_index(op.f('ix_printer_calibration_id'), table_name='printer_calibration')
    op.drop_index(op.f('ix_printer_calibration_printer_id'), table_name='printer_calibration')
    op.drop_table('printer_calibration')
