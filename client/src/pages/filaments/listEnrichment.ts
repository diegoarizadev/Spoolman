import { useQueries, useQuery } from "@tanstack/react-query";
import { ColumnType } from "antd/es/table/interface";
import { useMemo } from "react";
import { ParsedExtras } from "../../components/extraFields";
import { TableState } from "../../utils/saveload";
import { getAPIURL } from "../../utils/url";
import { CALIBRATION_TYPES, IFilamentCalibration } from "./calibrationModel";
import { formatValue } from "./calibrationsSection";
import { fetchMaterialDefaults, MaterialDefaults } from "./materialDefaultsCard";

export interface MaterialDefaultsFieldConfig {
  key: keyof MaterialDefaults;
  label: string;
  unit?: string;
}

/** Every Material Defaults field except brand/material/type, which already have their own columns. */
export const MATERIAL_DEFAULTS_FIELDS: MaterialDefaultsFieldConfig[] = [
  { key: "nozzle_temp", label: "Fab. Nozzle", unit: "°C" },
  { key: "bed_temp", label: "Fab. Cama", unit: "°C" },
  { key: "chamber_temp", label: "Fab. Cámara", unit: "°C" },
  { key: "fan_speed", label: "Fab. Fan Speed", unit: "%" },
  { key: "density", label: "Fab. Densidad", unit: "g/cm³" },
  { key: "diameter", label: "Fab. Diámetro", unit: "mm" },
  { key: "flow_ratio", label: "Fab. Flow Ratio" },
  { key: "max_volumetric_speed", label: "Fab. MVS", unit: "mm³/s" },
  { key: "max_speed", label: "Fab. Vel. máxima", unit: "mm/s" },
  { key: "drying_temp", label: "Fab. Temp. secado", unit: "°C" },
  { key: "drying_time_h", label: "Fab. Tiempo secado", unit: "h" },
  { key: "weight", label: "Fab. Peso nominal", unit: "g" },
  { key: "spool_weight", label: "Fab. Carrete vacío", unit: "g" },
  { key: "softening_temp", label: "Fab. Ablandamiento", unit: "°C" },
  { key: "vicat_temp", label: "Fab. Vicat", unit: "°C" },
  { key: "glass_transition_temp", label: "Fab. Tg", unit: "°C" },
  { key: "melting_temp", label: "Fab. Fusión", unit: "°C" },
  { key: "melt_flow_rate", label: "Fab. MFR", unit: "g/10min" },
  { key: "shore_hardness", label: "Fab. Shore" },
  { key: "tensile_strength_xy", label: "Fab. Tracción XY", unit: "MPa" },
  { key: "tensile_strength_z", label: "Fab. Tracción Z", unit: "MPa" },
  { key: "flexural_strength_xy", label: "Fab. Flexión XY", unit: "MPa" },
  { key: "flexural_strength_z", label: "Fab. Flexión Z", unit: "MPa" },
  { key: "elongation_xy", label: "Fab. Elongación XY", unit: "%" },
  { key: "elongation_z", label: "Fab. Elongación Z", unit: "%" },
  { key: "izod_notched_xy", label: "Fab. Izod XY", unit: "kJ/m²" },
  { key: "charpy_notched_xy", label: "Fab. Charpy XY", unit: "kJ/m²" },
  { key: "ams_compatibility", label: "Fab. AMS" },
  { key: "build_plate", label: "Fab. Placas" },
];

export interface CalibrationColumnConfig {
  type: string;
  label: string;
}

export const CALIBRATION_COLUMNS: CalibrationColumnConfig[] = CALIBRATION_TYPES.map((c) => ({
  type: c.type,
  label: `Calib. ${c.label}`,
}));

function materialDefaultsKey(vendor?: string, material?: string, type?: string): string {
  return `${vendor ?? ""}|${material ?? ""}|${type ?? ""}`;
}

/**
 * Fetches manufacturer defaults once per unique (vendor, material, tipo) combination present in
 * `rows`, instead of once per row -- many color variants share the same combo, so this keeps the
 * request count small regardless of table size. Returns a lookup keyed by that same combo string.
 */
export function useMaterialDefaultsByRow<T extends { ["vendor.name"]: string | null; material?: string; extra: { [key: string]: string } }>(
  rows: T[],
): Map<string, MaterialDefaults | null> {
  const combos = useMemo(() => {
    const seen = new Map<string, { vendor: string; material: string; type: string }>();
    for (const row of rows) {
      const tipo = ParsedExtras(row).extra?.tipo;
      const vendor = row["vendor.name"];
      const material = row.material;
      if (!vendor || !material || typeof tipo !== "string") {
        continue;
      }
      const key = materialDefaultsKey(vendor, material, tipo);
      if (!seen.has(key)) {
        seen.set(key, { vendor, material, type: tipo });
      }
    }
    return Array.from(seen.values());
  }, [rows]);

  const results = useQueries({
    queries: combos.map((combo) => ({
      queryKey: ["material-defaults", combo.vendor, combo.material, combo.type],
      queryFn: () => fetchMaterialDefaults(combo.vendor, combo.material, combo.type),
      staleTime: 60 * 60 * 1000,
      retry: false,
    })),
  });

  return useMemo(() => {
    const map = new Map<string, MaterialDefaults | null>();
    combos.forEach((combo, index) => {
      map.set(materialDefaultsKey(combo.vendor, combo.material, combo.type), results[index]?.data ?? null);
    });
    return map;
  }, [combos, results]);
}

async function fetchAllCalibrations(): Promise<IFilamentCalibration[]> {
  const response = await fetch(`${getAPIURL()}/filament-calibration`);
  if (!response.ok) {
    throw new Error(`Failed to fetch filament calibrations: ${response.status}`);
  }
  return response.json();
}

/** One request for every calibration record, grouped by filament_id -- cheaper than one request per row. */
export function useCalibrationsByFilament(): Map<number, Record<string, string>> {
  const { data } = useQuery({
    queryKey: ["filament-calibrations", "all"],
    queryFn: fetchAllCalibrations,
    staleTime: 60 * 1000,
  });

  return useMemo(() => {
    const map = new Map<number, Record<string, string>>();
    for (const record of data ?? []) {
      const filamentId = record.filament?.id;
      if (filamentId === undefined) {
        continue;
      }
      const byType = map.get(filamentId) ?? {};
      byType[record.calibration_type] = formatValue(record);
      map.set(filamentId, byType);
    }
    return map;
  }, [data]);
}

export const MATERIAL_DEFAULTS_COLUMN_IDS = MATERIAL_DEFAULTS_FIELDS.map((f) => `material_defaults.${f.key}`);
export const CALIBRATION_COLUMN_IDS = CALIBRATION_COLUMNS.map((c) => `calibration.${c.type}`);

interface RowWithComputed {
  material_defaults?: Partial<Record<string, string>>;
  calibration?: Record<string, string>;
}

/** Plain display columns -- no server sort/filter, since the values are computed client-side. */
export function buildMaterialDefaultsColumns<T extends RowWithComputed>(tableState: TableState): ColumnType<T>[] {
  return MATERIAL_DEFAULTS_FIELDS.map((field) => {
    const id = `material_defaults.${field.key}`;
    if (tableState.showColumns && !tableState.showColumns.includes(id)) {
      return undefined;
    }
    const column: ColumnType<T> = {
      key: id,
      dataIndex: ["material_defaults", field.key],
      title: field.label,
      width: 130,
      render: (value: string | undefined) => (value ? `${value}${field.unit ? ` ${field.unit}` : ""}` : ""),
    };
    return column;
  }).filter((c): c is ColumnType<T> => c !== undefined);
}

export function buildCalibrationColumns<T extends RowWithComputed>(tableState: TableState): ColumnType<T>[] {
  return CALIBRATION_COLUMNS.map((config) => {
    const id = `calibration.${config.type}`;
    if (tableState.showColumns && !tableState.showColumns.includes(id)) {
      return undefined;
    }
    const column: ColumnType<T> = {
      key: id,
      dataIndex: ["calibration", config.type],
      title: config.label,
      width: 160,
    };
    return column;
  }).filter((c): c is ColumnType<T> => c !== undefined);
}
