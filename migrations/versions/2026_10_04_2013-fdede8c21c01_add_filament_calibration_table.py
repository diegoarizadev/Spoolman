"""add_filament_calibration_table.

Creates the filament_calibration table, one row per OrcaSlicer calibration test
attempt recorded against a filament (temperature tower, pressure advance, adaptive
PA, flow ratio, tolerance, VFA, max volumetric speed, ironing).

Revision ID: fdede8c21c01
Revises: 842437ab5741
Create Date: 2026-10-04 20:13:26.753889
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'fdede8c21c01'
down_revision = '842437ab5741'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    op.create_table('filament_calibration',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('registered', sa.DateTime(), nullable=False),
    sa.Column('filament_id', sa.Integer(), nullable=False),
    sa.Column('calibration_type', sa.String(length=32), nullable=False),
    sa.Column('nozzle_temp', sa.Float(), nullable=True),
    sa.Column('pa_value', sa.Float(), nullable=True),
    sa.Column('flow_rate', sa.Float(), nullable=True),
    sa.Column('acceleration', sa.Float(), nullable=True),
    sa.Column('flow_ratio', sa.Float(), nullable=True),
    sa.Column('tolerance_offset', sa.Float(), nullable=True),
    sa.Column('vfa_speed_min', sa.Float(), nullable=True),
    sa.Column('vfa_speed_max', sa.Float(), nullable=True),
    sa.Column('max_volumetric_speed', sa.Float(), nullable=True),
    sa.Column('ironing_flow', sa.Float(), nullable=True),
    sa.Column('ironing_speed', sa.Float(), nullable=True),
    sa.Column('image_path', sa.String(length=512), nullable=True),
    sa.Column('notes', sa.String(length=1024), nullable=True),
    sa.ForeignKeyConstraint(['filament_id'], ['filament.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_filament_calibration_calibration_type'), 'filament_calibration', ['calibration_type'], unique=False)
    op.create_index(op.f('ix_filament_calibration_filament_id'), 'filament_calibration', ['filament_id'], unique=False)
    op.create_index(op.f('ix_filament_calibration_id'), 'filament_calibration', ['id'], unique=False)


def downgrade() -> None:
    """Perform the downgrade."""
    op.drop_index(op.f('ix_filament_calibration_id'), table_name='filament_calibration')
    op.drop_index(op.f('ix_filament_calibration_filament_id'), table_name='filament_calibration')
    op.drop_index(op.f('ix_filament_calibration_calibration_type'), table_name='filament_calibration')
    op.drop_table('filament_calibration')
