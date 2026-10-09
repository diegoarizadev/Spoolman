"""add_printer_table.

Creates the printer table: a catalog of 3D printer hardware specs
(build volume, temps, AMS compatibility, electrical specs...),
independent of spools/filaments.

Revision ID: e01386e04703
Revises: fdede8c21c01
Create Date: 2026-10-07 09:21:47.830217
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e01386e04703'
down_revision = 'fdede8c21c01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    op.create_table('printer',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('registered', sa.DateTime(), nullable=False),
    sa.Column('manufacturer', sa.String(length=64), nullable=False),
    sa.Column('model', sa.String(length=64), nullable=False),
    sa.Column('build_volume_x', sa.Float(), nullable=True),
    sa.Column('build_volume_y', sa.Float(), nullable=True),
    sa.Column('build_volume_z', sa.Float(), nullable=True),
    sa.Column('nozzle_diameters', sa.String(length=128), nullable=True),
    sa.Column('max_hotend_temp', sa.Integer(), nullable=True),
    sa.Column('max_bed_temp', sa.Integer(), nullable=True),
    sa.Column('chamber_enclosed', sa.Boolean(), nullable=False),
    sa.Column('chamber_heated', sa.Boolean(), nullable=False),
    sa.Column('chamber_max_temp', sa.Integer(), nullable=True),
    sa.Column('ams_compatible', sa.Boolean(), nullable=False),
    sa.Column('ams_units', sa.String(length=256), nullable=True),
    sa.Column('print_heads', sa.Integer(), nullable=True),
    sa.Column('colors_supported', sa.Integer(), nullable=True),
    sa.Column('supported_materials', sa.String(length=256), nullable=True),
    sa.Column('max_print_speed', sa.Float(), nullable=True),
    sa.Column('max_acceleration', sa.Float(), nullable=True),
    sa.Column('physical_width', sa.Float(), nullable=True),
    sa.Column('physical_depth', sa.Float(), nullable=True),
    sa.Column('physical_height', sa.Float(), nullable=True),
    sa.Column('net_weight', sa.Float(), nullable=True),
    sa.Column('voltage', sa.String(length=32), nullable=True),
    sa.Column('frequency', sa.String(length=32), nullable=True),
    sa.Column('max_power', sa.Float(), nullable=True),
    sa.Column('connectivity', sa.String(length=128), nullable=True),
    sa.Column('sku', sa.String(length=128), nullable=True),
    sa.Column('image_path', sa.String(length=512), nullable=True),
    sa.Column('comment', sa.String(length=1024), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_printer_id'), 'printer', ['id'], unique=False)
    op.create_index(op.f('ix_printer_manufacturer'), 'printer', ['manufacturer'], unique=False)


def downgrade() -> None:
    """Perform the downgrade."""
    op.drop_index(op.f('ix_printer_manufacturer'), table_name='printer')
    op.drop_index(op.f('ix_printer_id'), table_name='printer')
    op.drop_table('printer')
