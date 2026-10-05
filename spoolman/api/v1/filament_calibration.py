"""Filament calibration API: OrcaSlicer calibration test results per filament."""

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
from spoolman.api.v1.models import FilamentCalibration, FilamentCalibrationCreate, FilamentCalibrationUpdate, Message
from spoolman.database import database, filament_calibration
from spoolman.database.utils import SortOrder

router = APIRouter(
    prefix="/filament-calibration",
    tags=["filament-calibration"],
)

logger = logging.getLogger(__name__)


def get_image_dir() -> Path:
    """Get the directory where filament calibration evidence images are stored."""
    path = env.get_data_dir().joinpath("filament_calibration_images")
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.get(
    "",
    response_model=list[FilamentCalibration],
    responses={404: {"model": Message}},
)
async def find(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    filament_id: Annotated[int | None, Query(description="Filter by filament ID")] = None,
    sort: Annotated[str | None, Query(description="Sort by field. Example: 'registered:desc'.")] = None,
    limit: Annotated[int | None, Query(description="Limit the number of results.")] = None,
    offset: Annotated[int, Query(description="Offset for pagination.")] = 0,
) -> JSONResponse:
    """Find filament calibrations."""
    sort_by: dict[str, SortOrder] = {}
    if sort:
        for s in sort.split(","):
            field, order = s.split(":")
            sort_by[field] = SortOrder[order.upper()]

    items, total_count = await filament_calibration.find(
        db=db,
        filament_id=filament_id,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )
    return JSONResponse(
        content=jsonable_encoder(
            [FilamentCalibration.from_db(item) for item in items],
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
) -> FilamentCalibration:
    """Get a filament calibration by ID."""
    item = await filament_calibration.get_by_id(db, calibration_id)
    return FilamentCalibration.from_db(item)


@router.post(
    "",
    status_code=201,
    responses={404: {"model": Message}},
)
async def create(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    body: FilamentCalibrationCreate,
) -> FilamentCalibration:
    """Create a new filament calibration record."""
    try:
        item = await filament_calibration.create(
            db=db,
            filament_id=body.filament_id,
            calibration_type=body.calibration_type,
            nozzle_temp=body.nozzle_temp,
            pa_value=body.pa_value,
            flow_rate=body.flow_rate,
            acceleration=body.acceleration,
            flow_ratio=body.flow_ratio,
            tolerance_offset=body.tolerance_offset,
            vfa_speed_min=body.vfa_speed_min,
            vfa_speed_max=body.vfa_speed_max,
            max_volumetric_speed=body.max_volumetric_speed,
            ironing_flow=body.ironing_flow,
            ironing_speed=body.ironing_speed,
            notes=body.notes,
        )
        return FilamentCalibration.from_db(item)
    except Exception as e:
        logger.exception("Error creating filament calibration")
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch(
    "/{calibration_id}",
    responses={404: {"model": Message}},
)
async def update(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
    body: FilamentCalibrationUpdate,
) -> FilamentCalibration:
    """Update a filament calibration record."""
    item = await filament_calibration.update(
        db=db,
        calibration_id=calibration_id,
        data=body.model_dump(exclude_unset=True),
    )
    return FilamentCalibration.from_db(item)


@router.post(
    "/{calibration_id}/image",
    responses={404: {"model": Message}},
)
async def upload_image(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
    file: Annotated[UploadFile, File()],
) -> FilamentCalibration:
    """Upload an evidence image for a filament calibration."""
    try:
        await filament_calibration.get_by_id(db, calibration_id)

        file_ext = Path(file.filename or "").suffix
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = get_image_dir().joinpath(file_name)

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        item = await filament_calibration.update(db=db, calibration_id=calibration_id, data={"image_path": file_name})
        return FilamentCalibration.from_db(item)
    except Exception as e:
        logger.exception("Error uploading image for filament calibration %d", calibration_id)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get(
    "/{calibration_id}/image",
    responses={
        200: {"content": {"image/*": {}}},
        404: {"model": Message},
    },
)
async def get_image(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
) -> FileResponse:
    """Get the evidence image for a filament calibration."""
    item = await filament_calibration.get_by_id(db, calibration_id)
    if not item.image_path:
        raise HTTPException(status_code=404, detail="No image found for this calibration.")

    file_path = get_image_dir().joinpath(item.image_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found.")

    return FileResponse(file_path)


@router.delete(
    "/{calibration_id}",
    responses={404: {"model": Message}},
)
async def delete(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    calibration_id: int,
) -> Message:
    """Delete a filament calibration record."""
    item = await filament_calibration.get_by_id(db, calibration_id)

    if item.image_path:
        file_path = get_image_dir().joinpath(item.image_path)
        if file_path.exists():
            file_path.unlink()

    await filament_calibration.delete(db, calibration_id)
    return Message(message="Filament calibration deleted.")
