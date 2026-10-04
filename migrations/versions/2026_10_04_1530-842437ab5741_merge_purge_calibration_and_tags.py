"""merge_purge_calibration_and_tags.

Revision ID: 842437ab5741
Revises: 74c29f7bd37e, fe4970567bb3
Create Date: 2026-10-04 15:30:50.840876
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '842437ab5741'
down_revision = ('74c29f7bd37e', 'fe4970567bb3')
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Perform the upgrade."""
    pass


def downgrade() -> None:
    """Perform the downgrade."""
    pass
