export interface IFilamentCalibration {
  id: number;
  registered: string;
  filament?: { id: number };
  calibration_type: string;
  nozzle_temp?: number;
  pa_value?: number;
  flow_rate?: number;
  acceleration?: number;
  flow_ratio?: number;
  tolerance_offset?: number;
  vfa_speed_min?: number;
  vfa_speed_max?: number;
  max_volumetric_speed?: number;
  ironing_flow?: number;
  ironing_speed?: number;
  images?: { id: number }[];
  notes?: string;
}

export interface CalibrationField {
  key: keyof IFilamentCalibration;
  label: string;
  unit?: string;
  step?: number;
}

export interface CalibrationTypeConfig {
  type: string;
  label: string;
  fields: CalibrationField[];
  description: string;
  referenceUrl?: string;
}

/**
 * One entry per OrcaSlicer calibration test. `fields` says which columns of
 * IFilamentCalibration apply to that type -- the rest stay null for that record.
 * `description`/`referenceUrl` are summarized from the official OrcaSlicer wiki.
 */
export const CALIBRATION_TYPES: CalibrationTypeConfig[] = [
  {
    type: "temperature",
    label: "Temperatura",
    fields: [{ key: "nozzle_temp", label: "Temp. óptima", unit: "°C" }],
    description:
      "Imprime una torre con bloques a distintas temperaturas y evalúa cuál da el mejor resultado (menos stringing, mejor adhesión entre capas, voladizos más limpios). Registrá la temperatura del bloque ganador.",
    referenceUrl: "https://www.orcaslicer.com/wiki/calibration/temp_calib",
  },
  {
    type: "pressure_advance",
    label: "Pressure Advance",
    fields: [{ key: "pa_value", label: "PA", step: 0.001 }],
    description:
      "Compensa el retraso de presión al cambiar de velocidad, para evitar sobre/sub-extrusión en esquinas y bordes. Un solo valor fijo para todas las condiciones de impresión.",
    referenceUrl: "https://www.orcaslicer.com/wiki/calibration/pressure_advance_calib",
  },
  {
    type: "adaptive_pa",
    label: "Adaptive PA",
    fields: [
      { key: "pa_value", label: "PA", step: 0.001 },
      { key: "flow_rate", label: "Flujo", unit: "mm³/s" },
      { key: "acceleration", label: "Aceleración", unit: "mm/s²" },
    ],
    description:
      "Igual que Pressure Advance, pero el valor óptimo cambia según velocidad, flujo y aceleración. Acá registrás un punto (PA + flujo + aceleración) por cada corrida — agregá varias para construir la tabla.",
    referenceUrl: "https://www.orcaslicer.com/wiki/calibration/adaptive_pressure_advance_calib",
  },
  {
    type: "flow_ratio",
    label: "Flow Ratio",
    fields: [{ key: "flow_ratio", label: "Flow Ratio", step: 0.001 }],
    description:
      "Determina la cantidad óptima de extrusión para una superficie consistente y dimensiones precisas, evitando huecos (sub-extrusión) o superficies rugosas (sobre-extrusión).",
    referenceUrl: "https://www.orcaslicer.com/wiki/calibration/flow_ratio_calib",
  },
  {
    type: "tolerance",
    label: "Tolerancia",
    fields: [{ key: "tolerance_offset", label: "Offset", unit: "mm", step: 0.01 }],
    description:
      "Evalúa la precisión dimensional de tu impresora+filamento imprimiendo agujeros hexagonales con distintos offsets (0, 0.05, 0.1, 0.2, 0.3, 0.4mm) y midiéndolos con calibre. Registrá el offset que mejor ajustó.",
    referenceUrl: "https://www.orcaslicer.com/wiki/calibration/tolerance_calib",
  },
  {
    type: "vfa",
    label: "VFA (Resonancia)",
    fields: [
      { key: "vfa_speed_min", label: "Vel. mínima", unit: "mm/s" },
      { key: "vfa_speed_max", label: "Vel. máxima", unit: "mm/s" },
    ],
    description:
      "Identifica el rango de velocidad que genera artefactos de resonancia (ondulaciones visibles) en paredes verticales, para que el slicer evite esas velocidades.",
    referenceUrl: "https://www.orcaslicer.com/wiki/calibration/vfa_calib.html",
  },
  {
    type: "volumetric_speed",
    label: "Max Volumetric Speed",
    fields: [{ key: "max_volumetric_speed", label: "MVS", unit: "mm³/s" }],
    description:
      "Determina el flujo máximo (mm³/s) que tu combinación impresora+filamento soporta sin defectos ni atascos, para no pedirle al hotend más de lo que puede fundir.",
    referenceUrl: "https://www.orcaslicer.com/wiki/calibration/volumetric_speed_calib.html",
  },
  {
    type: "ironing",
    label: "Planchado (Ironing)",
    fields: [
      { key: "ironing_flow", label: "Flow", unit: "%" },
      { key: "ironing_speed", label: "Velocidad", unit: "mm/s" },
    ],
    description:
      "Segunda pasada sobre las superficies superiores con flujo muy bajo para alisarlas. OrcaSlicer no tiene un wizard de calibración dedicado para esto (a diferencia de los demás); el Flow y la Velocidad se ajustan a prueba y error.",
  },
];

export function getCalibrationTypeConfig(type: string): CalibrationTypeConfig | undefined {
  return CALIBRATION_TYPES.find((c) => c.type === type);
}
