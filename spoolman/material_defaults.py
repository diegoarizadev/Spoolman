"""Lookup of manufacturer-published slicer/material defaults, keyed by vendor + material + type.

The dataset is a static, bundled snapshot (spoolman/data/material_defaults.json) exported from a
third-party catalog site that blocks automated scraping, so unlike externaldb.py there is no live
sync -- the file is refreshed manually by re-exporting from the source and replacing it.
"""

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

DATA_FILE = Path(__file__).parent / "data" / "material_defaults.json"

# Vendor/material spelling differs between what a user types into Filament.vendor/material and
# what the source catalog calls it (e.g. "PLA+" vs "PLA+/Pro"). Keep this small and explicit
# rather than trying to fuzzy-normalize every possible spelling.
MATERIAL_ALIASES = {
    "PLA+": "PLA+/PRO",
    "PLA PRO": "PLA+/PRO",
}


def _normalize(value: str) -> str:
    return " ".join(value.strip().upper().split())


@lru_cache(maxsize=1)
def _load_index() -> dict[tuple[str, str, str], dict[str, Any]]:
    """Load the bundled dataset once and index it by (brand, material, type), all normalized."""
    if not DATA_FILE.exists():
        logger.warning("Material defaults dataset not found at %s.", DATA_FILE)
        return {}

    rows: list[dict[str, Any]] = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    index: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in rows:
        brand = row.get("brand")
        material = row.get("material")
        type_ = row.get("type")
        if not brand or not material or not type_:
            continue
        key = (_normalize(brand), _normalize(material), _normalize(type_))
        index[key] = row
    return index


def find_material_defaults(vendor: str, material: str, type_: str) -> dict[str, Any] | None:
    """Find the published defaults for a given vendor + material + type combination.

    All three must match (case/whitespace-insensitively) a row in the bundled dataset.
    Returns None if the dataset has no matching row.
    """
    index = _load_index()
    norm_material = _normalize(material)
    norm_material = MATERIAL_ALIASES.get(norm_material, norm_material)
    key = (_normalize(vendor), norm_material, _normalize(type_))
    return index.get(key)
