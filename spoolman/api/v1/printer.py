"""Printer API: a catalog of 3D printer hardware specs, with full CRUD."""

import logging
import shutil
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from spoolman import env
from spoolman.api.v1.models import Message, Printer, PrinterCreate, PrinterUpdate
from spoolman.database import database, printer
from spoolman.database.utils import SortOrder

router = APIRouter(
    prefix="/printer",
    tags=["printer"],
)

logger = logging.getLogger(__name__)


def get_image_dir() -> Path:
    """Get the directory where printer photos are stored."""
    path = env.get_data_dir().joinpath("printer_images")
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.get(
    "",
    response_model=list[Printer],
    responses={404: {"model": Message}},
)
async def find(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    sort: Annotated[str | None, Query(description="Sort by field. Example: 'manufacturer:asc'.")] = None,
    limit: Annotated[int | None, Query(description="Limit the number of results.")] = None,
    offset: Annotated[int, Query(description="Offset for pagination.")] = 0,
) -> JSONResponse:
    """Find printers."""
    sort_by: dict[str, SortOrder] = {}
    if sort:
        for s in sort.split(","):
            field, order = s.split(":")
            sort_by[field] = SortOrder[order.upper()]

    items, total_count = await printer.find(db=db, sort_by=sort_by, limit=limit, offset=offset)
    return JSONResponse(
        content=jsonable_encoder([Printer.from_db(item) for item in items]),
        headers={"x-total-count": str(total_count)},
    )


@router.get(
    "/{printer_id}",
    responses={404: {"model": Message}},
)
async def get(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    printer_id: int,
) -> Printer:
    """Get a printer by ID."""
    item = await printer.get_by_id(db, printer_id)
    return Printer.from_db(item)


@router.post(
    "",
    status_code=201,
    responses={404: {"model": Message}},
)
async def create(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    body: PrinterCreate,
) -> Printer:
    """Create a new printer."""
    try:
        item = await printer.create(db=db, data=body.model_dump())
        return Printer.from_db(item)
    except Exception as e:
        logger.exception("Error creating printer")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch(
    "/{printer_id}",
    responses={404: {"model": Message}},
)
async def update(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    printer_id: int,
    body: PrinterUpdate,
) -> Printer:
    """Update a printer."""
    item = await printer.update(db=db, printer_id=printer_id, data=body.model_dump(exclude_unset=True))
    return Printer.from_db(item)


@router.post(
    "/{printer_id}/image",
    responses={404: {"model": Message}},
)
async def upload_image(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    printer_id: int,
    file: Annotated[UploadFile, File()],
) -> Printer:
    """Upload a photo for a printer."""
    try:
        await printer.get_by_id(db, printer_id)

        file_ext = Path(file.filename or "").suffix
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = get_image_dir().joinpath(file_name)

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        item = await printer.update(db=db, printer_id=printer_id, data={"image_path": file_name})
        return Printer.from_db(item)
    except Exception as e:
        logger.exception("Error uploading image for printer %d", printer_id)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get(
    "/{printer_id}/image",
    responses={
        200: {"content": {"image/*": {}}},
        404: {"model": Message},
    },
)
async def get_image(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    printer_id: int,
) -> FileResponse:
    """Get the photo for a printer."""
    item = await printer.get_by_id(db, printer_id)
    if not item.image_path:
        raise HTTPException(status_code=404, detail="No image found for this printer.")

    file_path = get_image_dir().joinpath(item.image_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found.")

    return FileResponse(file_path)


@router.delete(
    "/{printer_id}",
    responses={404: {"model": Message}},
)
async def delete(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    printer_id: int,
) -> Message:
    """Delete a printer."""
    item = await printer.get_by_id(db, printer_id)

    if item.image_path:
        file_path = get_image_dir().joinpath(item.image_path)
        if file_path.exists():
            file_path.unlink()

    await printer.delete(db, printer_id)
    return Message(message="Printer deleted.")
