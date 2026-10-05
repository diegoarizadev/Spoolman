"""Helper functions for interacting with filament_calibration database objects."""

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
    filament_id: int,
    calibration_type: str,
    nozzle_temp: float | None = None,
    pa_value: float | None = None,
    flow_rate: float | None = None,
    acceleration: float | None = None,
    flow_ratio: float | None = None,
    tolerance_offset: float | None = None,
    vfa_speed_min: float | None = None,
    vfa_speed_max: float | None = None,
    max_volumetric_speed: float | None = None,
    ironing_flow: float | None = None,
    ironing_speed: float | None = None,
    image_path: str | None = None,
    notes: str | None = None,
) -> models.FilamentCalibration:
    """Add a new filament calibration record to the database."""
    item = models.FilamentCalibration(
        registered=datetime.utcnow().replace(microsecond=0),
        filament_id=filament_id,
        calibration_type=calibration_type,
        nozzle_temp=nozzle_temp,
        pa_value=pa_value,
        flow_rate=flow_rate,
        acceleration=acceleration,
        flow_ratio=flow_ratio,
        tolerance_offset=tolerance_offset,
        vfa_speed_min=vfa_speed_min,
        vfa_speed_max=vfa_speed_max,
        max_volumetric_speed=max_volumetric_speed,
        ironing_flow=ironing_flow,
        ironing_speed=ironing_speed,
        image_path=image_path,
        notes=notes,
    )
    db.add(item)
    await db.commit()
    return await get_by_id(db, item.id)


async def get_by_id(db: AsyncSession, calibration_id: int) -> models.FilamentCalibration:
    """Get a filament calibration object from the database by the unique ID."""
    stmt = (
        select(models.FilamentCalibration)
        .where(models.FilamentCalibration.id == calibration_id)
        .options(joinedload(models.FilamentCalibration.filament).joinedload(models.Filament.vendor))
    )
    rows = await db.execute(stmt)
    item = rows.unique().scalar_one_or_none()
    if item is None:
        raise ItemNotFoundError(f"No filament calibration with ID {calibration_id} found.")
    return item


async def find(
    *,
    db: AsyncSession,
    filament_id: int | None = None,
    sort_by: dict[str, SortOrder] | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[models.FilamentCalibration], int]:
    """Find a list of filament calibration objects by search criteria."""
    stmt = select(models.FilamentCalibration).options(
        joinedload(models.FilamentCalibration.filament).joinedload(models.Filament.vendor),
    )

    if filament_id is not None:
        stmt = stmt.where(models.FilamentCalibration.filament_id == filament_id)

    total_count = None

    if limit is not None:
        total_count_stmt = stmt.with_only_columns(func.count(), maintain_column_froms=True)
        total_count = (await db.execute(total_count_stmt)).scalar()
        stmt = stmt.offset(offset).limit(limit)

    if sort_by is not None:
        for fieldstr, order in sort_by.items():
            field = parse_nested_field(models.FilamentCalibration, fieldstr)
            if order == SortOrder.ASC:
                stmt = stmt.order_by(field.asc())
            elif order == SortOrder.DESC:
                stmt = stmt.order_by(field.desc())
    else:
        stmt = stmt.order_by(models.FilamentCalibration.registered.desc())

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
) -> models.FilamentCalibration:
    """Update the fields of a filament calibration object."""
    item = await get_by_id(db, calibration_id)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    return item


async def delete(db: AsyncSession, calibration_id: int) -> None:
    """Delete a filament calibration object."""
    item = await get_by_id(db, calibration_id)
    await db.delete(item)
    await db.commit()
