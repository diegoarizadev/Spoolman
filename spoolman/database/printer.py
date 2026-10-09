"""Helper functions for interacting with printer database objects."""

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from spoolman.database import models
from spoolman.database.utils import SortOrder, parse_nested_field
from spoolman.exceptions import ItemNotFoundError


async def create(*, db: AsyncSession, data: dict) -> models.Printer:
    """Add a new printer to the database."""
    item = models.Printer(registered=datetime.utcnow().replace(microsecond=0), **data)
    db.add(item)
    await db.commit()
    return await get_by_id(db, item.id)


async def get_by_id(db: AsyncSession, printer_id: int) -> models.Printer:
    """Get a printer object from the database by the unique ID."""
    stmt = select(models.Printer).where(models.Printer.id == printer_id)
    rows = await db.execute(stmt)
    item = rows.unique().scalar_one_or_none()
    if item is None:
        raise ItemNotFoundError(f"No printer with ID {printer_id} found.")
    return item


async def find(
    *,
    db: AsyncSession,
    sort_by: dict[str, SortOrder] | None = None,
    limit: int | None = None,
    offset: int = 0,
) -> tuple[list[models.Printer], int]:
    """Find a list of printer objects."""
    stmt = select(models.Printer)

    total_count = None
    if limit is not None:
        total_count_stmt = stmt.with_only_columns(func.count(), maintain_column_froms=True)
        total_count = (await db.execute(total_count_stmt)).scalar()
        stmt = stmt.offset(offset).limit(limit)

    if sort_by is not None:
        for fieldstr, order in sort_by.items():
            field = parse_nested_field(models.Printer, fieldstr)
            if order == SortOrder.ASC:
                stmt = stmt.order_by(field.asc())
            elif order == SortOrder.DESC:
                stmt = stmt.order_by(field.desc())
    else:
        stmt = stmt.order_by(models.Printer.manufacturer.asc(), models.Printer.model.asc())

    rows = await db.execute(stmt, execution_options={"populate_existing": True})
    result = list(rows.unique().scalars().all())
    if total_count is None:
        total_count = len(result)

    return result, total_count


async def update(*, db: AsyncSession, printer_id: int, data: dict) -> models.Printer:
    """Update the fields of a printer object."""
    item = await get_by_id(db, printer_id)
    for k, v in data.items():
        setattr(item, k, v)
    await db.commit()
    return item


async def delete(db: AsyncSession, printer_id: int) -> None:
    """Delete a printer object."""
    item = await get_by_id(db, printer_id)
    await db.delete(item)
    await db.commit()
