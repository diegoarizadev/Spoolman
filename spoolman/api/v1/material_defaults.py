"""Material defaults API: manufacturer-published slicer/material defaults lookup."""

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from spoolman.material_defaults import find_material_defaults

router = APIRouter(
    prefix="/material-defaults",
    tags=["material-defaults"],
)

logger = logging.getLogger(__name__)


class MaterialDefaults(BaseModel):
    brand: str = Field(description="Manufacturer name.")
    material: str = Field(description="Material, e.g. PLA.")
    type: str = Field(description="Product line/type, e.g. Basic, Matte, High Speed.")
    filament_count: str | None = None
    nozzle_temp: str | None = Field(None, description="Nozzle temperature range in °C.")
    bed_temp: str | None = Field(None, description="Bed temperature range in °C.")
    chamber_temp: str | None = Field(None, description="Chamber temperature in °C.")
    fan_speed: str | None = Field(None, description="Fan speed range in %.")
    fan_speed_bridges: str | None = None
    layers_without_fan: str | None = None
    density: str | None = Field(None, description="Density in g/cm3.")
    diameter: str | None = Field(None, description="Diameter in mm.")
    flow_ratio: str | None = None
    max_volumetric_speed: str | None = Field(None, description="Max volumetric speed in mm3/s.")
    max_speed: str | None = Field(None, description="Max print speed in mm/s.")
    first_layer_speed: str | None = None
    first_layer_infill_speed: str | None = None
    outer_wall_speed: str | None = None
    top_surface_speed: str | None = None
    ironing_flow: str | None = None
    ironing_speed: str | None = None
    drying_temp: str | None = Field(None, description="Recommended drying temperature in °C.")
    drying_time_h: str | None = Field(None, description="Recommended drying time in hours.")
    spool_weight: str | None = Field(None, description="Empty spool weight in grams.")
    weight: str | None = Field(None, description="Nominal net filament weight in grams.")
    shrinkage: str | None = None
    softening_temp: str | None = None
    vicat_temp: str | None = None
    hdt_045mpa: str | None = None
    hdt_18mpa: str | None = None
    glass_transition_temp: str | None = None
    melting_temp: str | None = None
    melt_flow_rate: str | None = None
    mfr_condition: str | None = None
    mfr_standard: str | None = None
    shore_hardness: str | None = None
    tensile_strength_xy: str | None = None
    tensile_strength_z: str | None = None
    tensile_modulus_xy: str | None = None
    tensile_modulus_z: str | None = None
    elongation_xy: str | None = None
    elongation_z: str | None = None
    flexural_strength_xy: str | None = None
    flexural_strength_z: str | None = None
    flexural_modulus_xy: str | None = None
    flexural_modulus_z: str | None = None
    charpy_notched_xy: str | None = None
    charpy_notched_z: str | None = None
    charpy_unnotched_xy: str | None = None
    charpy_unnotched_z: str | None = None
    izod_notched_xy: str | None = None
    izod_notched_z: str | None = None
    ams_compatibility: str | None = Field(None, description="Comma-separated AMS unit compatibility.")
    build_plate: str | None = Field(None, description="Comma-separated recommended build plates.")


@router.get(
    "",
    name="Find material defaults",
    description=(
        "Look up manufacturer-published slicer/material defaults for a vendor + material + type "
        "combination. Returns 404 if the bundled dataset has no matching row."
    ),
)
async def get_material_defaults(
    vendor: Annotated[str, Query(description="Vendor/manufacturer name.")],
    material: Annotated[str, Query(description="Material, e.g. PLA.")],
    type: Annotated[str, Query(description="Product line/type, e.g. Basic, Matte, High Speed.")],  # noqa: A002
) -> MaterialDefaults:
    """Find material defaults for a vendor + material + type combination."""
    row = find_material_defaults(vendor, material, type)
    if row is None:
        raise HTTPException(status_code=404, detail="No material defaults found for this combination.")
    return MaterialDefaults(**row)
