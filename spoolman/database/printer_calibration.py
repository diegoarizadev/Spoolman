"""Helper functions for interacting with printer_calibration database objects."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from spoolman.database import models
from spoolman.database.utils import SortOrder, parse_nested_field
from spoolman.exceptions import ItemNotFoundError


async def create(
    *,
    db: AsyncSession,
    printer_id: int,
    vfa_speed_min: float | None = None,
    vfa_speed_max: float | None = None,
    image_path: str | None = None,
    notes: str | None = None,
) -> models.PrinterCalibration:
    """Add a new printer calibration record to the database."""
    item = models.PrinterCalibration(
        registered=datetime.utcnow().replace(microsecond=0),
        printer_id=printer_id,
        vfa_speed_min=vfa_speed_min,
        vfa_speed_max=vfa_speed_max,
        image_path=image_path,
        notes=notes,
    )
    db.add(item)
    await db.commit()
    return await get_by_id(db, item.id)


async def get_by_id(db: AsyncSession, calibration_id: int) -> models.PrinterCalibration:
    """Get a printer calibration object from the database by the unique ID."""
    stmt = (
        select(models.PrinterCalibration)
        .where(models.PrinterCalibration.id == calibration_id)
        .options(joinedload(models.PrinterCalibration.printer))
    )
    rows = await db.execute(stmt)
    item = rows.unique().scalar_one_or_none()
    if item is None:
        raise ItemNotFoundError(f"No printer calibration with ID {calibration_id} found.")
    return item


async def find(
    *,
    db: AsyncSession,
    printer_id: int | None = None,
    sort_by: dict[str, SortOrder] | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[models.PrinterCalibration], int]:
    """Find a list of printer calibration objects by search criteria."""
    stmt = select(models.PrinterCalibration).options(
        joinedload(models.PrinterCalibration.printer),
    )

    if printer_id is not None:
        stmt = stmt.where(models.PrinterCalibration.printer_id == printer_id)

    total_count = None

    if limit is not None:
        total_count_stmt = stmt.with_only_columns(func.count(), maintain_column_froms=True)
        total_count = (await db.execute(total_count_stmt)).scalar()
        stmt = stmt.offset(offset).limit(limit)

    if sort_by is not None:
        for fieldstr, order in sort_by.items():
            field = parse_nested_field(models.PrinterCalibration, fieldstr)
            if order == SortOrder.ASC:
                stmt = stmt.order_by(field.asc())
            elif order == SortOrder.DESC:
                stmt = stmt.order_by(field.desc())
    else:
        stmt = stmt.order_by(models.PrinterCalibration.registered.desc())

    rows = await db.execute(stmt, execution_options={"populate_existing": True})
    result = list(rows.unique().scalars().all())
    if total_count is None:
        total_count = len(result)

    return result, total_count


async def update(
    *,
    db: AsyncSession,
    calibration_id: int,
    data: dict,
) -> models.PrinterCalibration:
    """Update the fields of a printer calibration object."""
    item = await get_by_id(db, calibration_id)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    return item


async def delete(db: AsyncSession, calibration_id: int) -> None:
    """Delete a printer calibration object."""
    item = await get_by_id(db, calibration_id)
    await db.delete(item)
    await db.commit()
