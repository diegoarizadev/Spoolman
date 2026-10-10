"""Helper functions for interacting with calibration_image database objects."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from spoolman.database import models
from spoolman.exceptions import ItemNotFoundError


async def add(
    *,
    db: AsyncSession,
    image_path: str,
    filament_calibration_id: int | None = None,
    printer_calibration_id: int | None = None,
) -> models.CalibrationImage:
    """Attach an evidence image to a filament calibration or a printer calibration."""
    item = models.CalibrationImage(
        image_path=image_path,
        filament_calibration_id=filament_calibration_id,
        printer_calibration_id=printer_calibration_id,
    )
    db.add(item)
    await db.commit()
    return item


async def get_by_id(db: AsyncSession, image_id: int) -> models.CalibrationImage:
    """Get a calibration image from the database by the unique ID."""
    rows = await db.execute(select(models.CalibrationImage).where(models.CalibrationImage.id == image_id))
    item = rows.scalar_one_or_none()
    if item is None:
        raise ItemNotFoundError(f"No calibration image with ID {image_id} found.")
    return item


async def delete(db: AsyncSession, image_id: int) -> None:
    """Delete a calibration image row (the caller removes the file)."""
    item = await get_by_id(db, image_id)
    await db.delete(item)
    await db.commit()
