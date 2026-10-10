"""add_calibration_image_table.

Creates calibration_image so a filament calibration or a printer VFA test can have
several evidence photos. Existing single photos (image_path) are copied over.

Revision ID: c4d92e17a5b3
Revises: b81f4d2c6e07
Create Date: 2026-10-09 18:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c4d92e17a5b3'
down_revision = 'b81f4d2c6e07'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    op.create_table('calibration_image',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('filament_calibration_id', sa.Integer(), nullable=True),
    sa.Column('printer_calibration_id', sa.Integer(), nullable=True),
    sa.Column('image_path', sa.String(length=512), nullable=False),
    sa.ForeignKeyConstraint(['filament_calibration_id'], ['filament_calibration.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['printer_calibration_id'], ['printer_calibration.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_calibration_image_id'), 'calibration_image', ['id'], unique=False)
    op.create_index(op.f('ix_calibration_image_filament_calibration_id'), 'calibration_image', ['filament_calibration_id'], unique=False)
    op.create_index(op.f('ix_calibration_image_printer_calibration_id'), 'calibration_image', ['printer_calibration_id'], unique=False)

    # Keep every photo that already exists.
    op.execute(
        "INSERT INTO calibration_image (filament_calibration_id, image_path) "
        "SELECT id, image_path FROM filament_calibration WHERE image_path IS NOT NULL"
    )
    op.execute(
        "INSERT INTO calibration_image (printer_calibration_id, image_path) "
        "SELECT id, image_path FROM printer_calibration WHERE image_path IS NOT NULL"
    )


def downgrade() -> None:
    """Perform the downgrade."""
    op.drop_index(op.f('ix_calibration_image_printer_calibration_id'), table_name='calibration_image')
    op.drop_index(op.f('ix_calibration_image_filament_calibration_id'), table_name='calibration_image')
    op.drop_index(op.f('ix_calibration_image_id'), table_name='calibration_image')
    op.drop_table('calibration_image')
