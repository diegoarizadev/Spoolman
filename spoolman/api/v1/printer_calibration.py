"""Printer calibration API: VFA calibration test results per printer."""

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
from spoolman.api.v1.models import Message, PrinterCalibration, PrinterCalibrationCreate, PrinterCalibrationUpdate
from spoolman.database import calibration_image, database, printer_calibration
from spoolman.database.utils import SortOrder

router = APIRouter(
    prefix="/printer-calibration",
    tags=["printer-calibration"],
)

logger = logging.getLogger(__name__)


def get_image_dir() -> Path:
    """Get the directory where printer calibration evidence images are stored."""
    path = env.get_data_dir().joinpath("printer_calibration_images")
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.get(
    "",
    response_model=list[PrinterCalibration],
    responses={404: {"model": Message}},
)
async def find(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    printer_id: Annotated[int | None, Query(description="Filter by printer ID")] = None,
    sort: Annotated[str | None, Query(description="Sort by field. Example: 'registered:desc'.")] = None,
    limit: Annotated[int | None, Query(description="Limit the number of results.")] = None,
    offset: Annotated[int, Query(description="Offset for pagination.")] = 0,
) -> JSONResponse:
    """Find printer calibrations."""
    sort_by: dict[str, SortOrder] = {}
    if sort:
        for s in sort.split(","):
            field, order = s.split(":")
            sort_by[field] = SortOrder[order.upper()]

    items, total_count = await printer_calibration.find(
        db=db,
        printer_id=printer_id,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )
    return JSONResponse(
        content=jsonable_encoder(
            [PrinterCalibration.from_db(item) for item in items],
        ),
        headers={"x-total-count": str(total_count)},
    )


@router.get(
    "/{calibration_id}",
    responses={404: {"model": Message}},
)
async def get(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
) -> PrinterCalibration:
    """Get a printer calibration by ID."""
    item = await printer_calibration.get_by_id(db, calibration_id)
    return PrinterCalibration.from_db(item)


@router.post(
    "",
    status_code=201,
    responses={404: {"model": Message}},
)
async def create(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    body: PrinterCalibrationCreate,
) -> PrinterCalibration:
    """Create a new printer calibration record."""
    try:
        item = await printer_calibration.create(
            db=db,
            printer_id=body.printer_id,
            vfa_speed_min=body.vfa_speed_min,
            vfa_speed_max=body.vfa_speed_max,
            notes=body.notes,
        )
        return PrinterCalibration.from_db(item)
    except Exception as e:
        logger.exception("Error creating printer calibration")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch(
    "/{calibration_id}",
    responses={404: {"model": Message}},
)
async def update(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
    body: PrinterCalibrationUpdate,
) -> PrinterCalibration:
    """Update a printer calibration record."""
    item = await printer_calibration.update(
        db=db,
        calibration_id=calibration_id,
        data=body.model_dump(exclude_unset=True),
    )
    return PrinterCalibration.from_db(item)


@router.post(
    "/{calibration_id}/image",
    responses={404: {"model": Message}},
)
async def upload_image(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
    file: Annotated[UploadFile, File()],
) -> PrinterCalibration:
    """Add an evidence image to a printer calibration. Can be called repeatedly to attach several."""
    try:
        await printer_calibration.get_by_id(db, calibration_id)

        file_ext = Path(file.filename or "").suffix
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = get_image_dir().joinpath(file_name)

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        await calibration_image.add(db=db, image_path=file_name, printer_calibration_id=calibration_id)
        item = await printer_calibration.get_by_id(db, calibration_id)
        return PrinterCalibration.from_db(item)
    except Exception as e:
        logger.exception("Error uploading image for printer calibration %d", calibration_id)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get(
    "/{calibration_id}/image/{image_id}",
    responses={
        200: {"content": {"image/*": {}}},
        404: {"model": Message},
    },
)
async def get_image(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
    image_id: int,
) -> FileResponse:
    """Get one evidence image of a printer calibration."""
    image = await calibration_image.get_by_id(db, image_id)
    if image.printer_calibration_id != calibration_id:
        raise HTTPException(status_code=404, detail="Image not found for this calibration.")

    file_path = get_image_dir().joinpath(image.image_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found.")

    return FileResponse(file_path)


@router.delete(
    "/{calibration_id}/image/{image_id}",
    responses={404: {"model": Message}},
)
async def delete_image(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
    image_id: int,
) -> PrinterCalibration:
    """Remove one evidence image from a printer calibration."""
    image = await calibration_image.get_by_id(db, image_id)
    if image.printer_calibration_id != calibration_id:
        raise HTTPException(status_code=404, detail="Image not found for this calibration.")

    file_path = get_image_dir().joinpath(image.image_path)
    if file_path.exists():
        file_path.unlink()

    await calibration_image.delete(db, image_id)
    item = await printer_calibration.get_by_id(db, calibration_id)
    return PrinterCalibration.from_db(item)


@router.delete(
    "/{calibration_id}",
    responses={404: {"model": Message}},
)
async def delete(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
) -> Message:
    """Delete a printer calibration record."""
    item = await printer_calibration.get_by_id(db, calibration_id)

    for image in item.images:
        file_path = get_image_dir().joinpath(image.image_path)
        if file_path.exists():
            file_path.unlink()

    await printer_calibration.delete(db, calibration_id)
    return Message(message="Printer calibration deleted.")
