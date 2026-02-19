import logging
import shutil
import uuid
from pathlib import Path
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from spoolman import env
from spoolman.api.v1.models import Message, PurgeCalibration, PurgeCalibrationCreate, PurgeCalibrationUpdate
from spoolman.database import database, purge
from spoolman.database.utils import SortOrder
from spoolman.exceptions import ItemNotFoundError
from spoolman.ws import websocket_manager

router = APIRouter(
    prefix="/purge",
    tags=["purge"],
)

logger = logging.getLogger(__name__)


def get_image_dir() -> Path:
    """Get the directory where purge calibration images are stored."""
    path = env.get_data_dir().joinpath("purge_images")
    path.mkdir(parents=True, exist_ok=True)
    return path


@router.get(
    "",
    response_model=list[PurgeCalibration],
    responses={404: {"model": Message}},
)
async def find(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    from_filament_id: Optional[int] = Query(None, description="Filter by source filament ID"),
    to_filament_id: Optional[int] = Query(None, description="Filter by destination filament ID"),
    sort: Optional[str] = Query(None, description="Sort by field. Example: 'id:asc'."),
    limit: Optional[int] = Query(None, description="Limit the number of results."),
    offset: int = Query(0, description="Offset for pagination."),
) -> Any:
    """Find purge calibrations."""
    sort_by: dict[str, SortOrder] = {}
    if sort:
        for s in sort.split(","):
            field, order = s.split(":")
            sort_by[field] = SortOrder[order.upper()]

    items, total_count = await purge.find(
        db=db,
        from_filament_id=from_filament_id,
        to_filament_id=to_filament_id,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )
    # Set x-total-count header for pagination (required by Refine's useList)
    return JSONResponse(
        content=jsonable_encoder(
            [PurgeCalibration.from_db(item) for item in items],
        ),
        headers={"x-total-count": str(total_count)},
    )


@router.websocket("")
async def websocket_purge_list(websocket: WebSocket) -> None:
    """WebSocket for live updates on the purge calibration list."""
    await websocket.accept()
    websocket_manager.connect(("purge",), websocket)
    try:
        while True:
            if await websocket.receive_text():
                await websocket.send_json({"status": "healthy"})
    except WebSocketDisconnect:
        websocket_manager.disconnect(("purge",), websocket)


@router.get(
    "/{purge_id}",
    response_model=PurgeCalibration,
    responses={404: {"model": Message}},
)
async def get(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    purge_id: int,
):
    """Get a purge calibration by ID."""
    item = await purge.get_by_id(db, purge_id)
    return PurgeCalibration.from_db(item)


@router.websocket("/{purge_id}")
async def websocket_purge_item(websocket: WebSocket, purge_id: int) -> None:
    """WebSocket for live updates on a specific purge calibration."""
    await websocket.accept()
    websocket_manager.connect(("purge", str(purge_id)), websocket)
    try:
        while True:
            if await websocket.receive_text():
                await websocket.send_json({"status": "healthy"})
    except WebSocketDisconnect:
        websocket_manager.disconnect(("purge", str(purge_id)), websocket)


@router.post(
    "",
    response_model=PurgeCalibration,
    status_code=201,
    responses={
        404: {"model": Message},
        409: {"model": Message},
    },
)
async def create(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    body: PurgeCalibrationCreate,
):
    """Create a new purge calibration."""
    try:
        # Check if already exists (unique key: from_filament + to_filament + nozzle_size)
        existing = await purge.get_by_filament_pair(
            db=db,
            from_filament_id=body.from_filament_id,
            to_filament_id=body.to_filament_id,
            nozzle_size=body.nozzle_size,
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"AlreadyExists:{existing.id}"
            )

        item = await purge.create(
            db=db,
            from_filament_id=body.from_filament_id,
            to_filament_id=body.to_filament_id,
            purge_volume=body.purge_volume,
            multiplication_factor=body.multiplication_factor,
            nozzle_size=body.nozzle_size,
            print_temp=body.print_temp,
            comment=body.comment,
        )
        return PurgeCalibration.from_db(item)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error creating purge calibration")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch(
    "/{purge_id}",
    response_model=PurgeCalibration,
    responses={404: {"model": Message}},
)
async def update(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    purge_id: int,
    body: PurgeCalibrationUpdate,
):
    """Update a purge calibration."""
    try:
        item = await purge.update(
            db=db,
            purge_id=purge_id,
            data=body.model_dump(exclude_unset=True),
        )
        return PurgeCalibration.from_db(item)
    except ItemNotFoundError:
        raise HTTPException(status_code=404, detail="Purge calibration not found.")
    except Exception as e:
        logger.exception("Error updating purge calibration %d", purge_id)
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/{purge_id}/image",
    response_model=PurgeCalibration,
    responses={404: {"model": Message}},
)
async def upload_image(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    purge_id: int,
    file: UploadFile = File(...),
):
    """Upload an image for a purge calibration."""
    try:
        item = await purge.get_by_id(db, purge_id)

        # Save file
        file_ext = Path(file.filename).suffix
        file_name = f"{uuid.uuid4()}{file_ext}"
        file_path = get_image_dir().joinpath(file_name)

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Update database
        item = await purge.update(db=db, purge_id=purge_id, data={"image_path": file_name})
        return PurgeCalibration.from_db(item)
    except Exception as e:
        logger.exception("Error uploading image for purge calibration %d", purge_id)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{purge_id}/image",
    responses={
        200: {"content": {"image/*": {}}},
        404: {"model": Message},
    },
)
async def get_image(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    purge_id: int,
):
    """Get the image for a purge calibration."""
    item = await purge.get_by_id(db, purge_id)
    if not item.image_path:
        raise HTTPException(status_code=404, detail="No image found for this calibration.")

    file_path = get_image_dir().joinpath(item.image_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found.")

    return FileResponse(file_path)


@router.delete(
    "/{purge_id}",
    response_model=Message,
    responses={404: {"model": Message}},
)
async def delete(
    db: Annotated[AsyncSession, Depends(database.get_db_session)],
    purge_id: int,
):
    """Delete a purge calibration."""
    item = await purge.get_by_id(db, purge_id)

    if item.image_path:
        file_path = get_image_dir().joinpath(item.image_path)
        if file_path.exists():
            file_path.unlink()

    await purge.delete(db, purge_id)
    return Message(message="Purge calibration deleted.")
