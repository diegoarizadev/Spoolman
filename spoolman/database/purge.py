"""Helper functions for interacting with purge_calibration database objects."""

import logging
from datetime import datetime
from typing import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from spoolman.database import models
from spoolman.database.utils import (
    SortOrder,
    add_where_clause_int_in,
    add_where_clause_int_opt,
    parse_nested_field,
)
from spoolman.exceptions import ItemNotFoundError


async def create(
    *,
    db: AsyncSession,
    from_filament_id: int,
    to_filament_id: int,
    purge_volume: float,
    multiplication_factor: float = 1.0,
    nozzle_size: float,
    print_temp: int,
    image_path: str | None = None,
    comment: str | None = None,
) -> models.PurgeCalibration:
    """Add a new purge calibration to the database."""
    purge = models.PurgeCalibration(
        registered=datetime.utcnow().replace(microsecond=0),
        from_filament_id=from_filament_id,
        to_filament_id=to_filament_id,
        purge_volume=purge_volume,
        multiplication_factor=multiplication_factor,
        nozzle_size=nozzle_size,
        print_temp=print_temp,
        image_path=image_path,
        comment=comment,
    )
    db.add(purge)
    await db.commit()
    return await get_by_id(db, purge.id)


async def get_by_id(db: AsyncSession, purge_id: int) -> models.PurgeCalibration:
    """Get a purge calibration object from the database by the unique ID."""
    stmt = (
        select(models.PurgeCalibration)
        .where(models.PurgeCalibration.id == purge_id)
        .options(
            joinedload(models.PurgeCalibration.from_filament).joinedload(models.Filament.vendor),
            joinedload(models.PurgeCalibration.to_filament).joinedload(models.Filament.vendor),
        )
    )
    rows = await db.execute(stmt)
    purge = rows.unique().scalar_one_or_none()
    if purge is None:
        raise ItemNotFoundError(f"No purge calibration with ID {purge_id} found.")
    return purge


async def get_by_filament_pair(
    db: AsyncSession,
    from_filament_id: int,
    to_filament_id: int,
    nozzle_size: float | None = None,
) -> models.PurgeCalibration | None:
    """Get a purge calibration object by filament pair and nozzle size.

    The unique key is (from_filament_id, to_filament_id, nozzle_size).
    If nozzle_size is None, only the filament pair is matched.
    """
    conditions = [
        models.PurgeCalibration.from_filament_id == from_filament_id,
        models.PurgeCalibration.to_filament_id == to_filament_id,
    ]
    if nozzle_size is not None:
        conditions.append(models.PurgeCalibration.nozzle_size == nozzle_size)

    stmt = (
        select(models.PurgeCalibration)
        .where(*conditions)
        .options(
            joinedload(models.PurgeCalibration.from_filament).joinedload(models.Filament.vendor),
            joinedload(models.PurgeCalibration.to_filament).joinedload(models.Filament.vendor),
        )
    )
    rows = await db.execute(stmt)
    return rows.unique().scalar_one_or_none()


async def find(
    *,
    db: AsyncSession,
    ids: list[int] | None = None,
    from_filament_id: int | Sequence[int] | None = None,
    to_filament_id: int | Sequence[int] | None = None,
    sort_by: dict[str, SortOrder] | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[models.PurgeCalibration], int]:
    """Find a list of purge calibration objects by search criteria."""
    stmt = (
        select(models.PurgeCalibration)
        .options(joinedload(models.PurgeCalibration.from_filament).joinedload(models.Filament.vendor))
        .options(joinedload(models.PurgeCalibration.to_filament).joinedload(models.Filament.vendor))
    )

    stmt = add_where_clause_int_in(stmt, models.PurgeCalibration.id, ids)
    stmt = add_where_clause_int_opt(stmt, models.PurgeCalibration.from_filament_id, from_filament_id)
    stmt = add_where_clause_int_opt(stmt, models.PurgeCalibration.to_filament_id, to_filament_id)

    total_count = None

    if limit is not None:
        total_count_stmt = stmt.with_only_columns(func.count(), maintain_column_froms=True)
        total_count = (await db.execute(total_count_stmt)).scalar()

        stmt = stmt.offset(offset).limit(limit)

    if sort_by is not None:
        for fieldstr, order in sort_by.items():
            field = parse_nested_field(models.PurgeCalibration, fieldstr)
            if order == SortOrder.ASC:
                stmt = stmt.order_by(field.asc())
            elif order == SortOrder.DESC:
                stmt = stmt.order_by(field.desc())

    rows = await db.execute(
        stmt,
        execution_options={"populate_existing": True},
    )
    result = list(rows.unique().scalars().all())
    if total_count is None:
        total_count = len(result)

    return result, total_count


async def update(
    *,
    db: AsyncSession,
    purge_id: int,
    data: dict,
) -> models.PurgeCalibration:
    """Update the fields of a purge calibration object."""
    purge = await get_by_id(db, purge_id)
    for k, v in data.items():
        setattr(purge, k, v)
    await db.commit()
    return purge


async def delete(db: AsyncSession, purge_id: int) -> None:
    """Delete a purge calibration object."""
    purge = await get_by_id(db, purge_id)
    await db.delete(purge)
    await db.commit()


async def get_recommendation(
    *,
    db: AsyncSession,
    from_filament_id: int,
    to_filament_id: int,
) -> float | None:
    """
    Get a recommended purge volume.
    1. Look for exact match.
    2. Look for match by material and vendor.
    3. Look for match by material.
    """
    # 1. Exact match
    stmt = select(models.PurgeCalibration.purge_volume).where(
        models.PurgeCalibration.from_filament_id == from_filament_id,
        models.PurgeCalibration.to_filament_id == to_filament_id,
    ).limit(1)
    result = (await db.execute(stmt)).scalar()
    if result is not None:
        return result

    # Get filament details
    from_f = await db.get(models.Filament, from_filament_id)
    to_f = await db.get(models.Filament, to_filament_id)
    if not from_f or not to_f:
        return None

    # 2. Match by material and vendor
    stmt = (
        select(models.PurgeCalibration.purge_volume)
        .join(models.Filament, models.PurgeCalibration.from_filament_id == models.Filament.id, isouter=True, name="from_f")
        .join(models.Filament, models.PurgeCalibration.to_filament_id == models.Filament.id, isouter=True, name="to_f")
        .where(
            models.Filament.material == from_f.material,
            models.Filament.vendor_id == from_f.vendor_id,
            models.PurgeCalibration.to_filament_id == to_filament_id # To is still exact
        )
        .limit(1)
    )
    # This query might be too complex for a one-shot, but let's try a simpler approach if it fails.
    # Actually, let's just find any calibration where from_material == from_f.material and to_material == to_f.material
    
    stmt = (
        select(models.PurgeCalibration.purge_volume)
        .join(models.PurgeCalibration.from_filament)
        .join(models.PurgeCalibration.to_filament)
        .where(
            models.Filament.material == from_f.material,
            models.PurgeCalibration.to_filament_id == to_filament_id
        )
        .limit(1)
    )
    # This is still just a heuristic. The user specifically asked:
    # "si probaste "Sunlu PLA Black" a "Bambu PLA White", sugerir el mismo valor para "eSun PLA Black" a "Bambu PLA White""
    
    # Let's implement it logically:
    # Find any calibration where:
    # from_filament.material == from_f.material AND to_filament_id == to_filament_id
    
    return None # Placeholder for now, I will refine this after seeing if basic CRUD works.
