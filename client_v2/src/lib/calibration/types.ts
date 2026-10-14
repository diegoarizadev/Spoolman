import type { CalibrationValueKey, FilamentCalibration } from '$lib/api/filamentCalibration';
import * as m from '$lib/paraglide/messages';

// One entry per OrcaSlicer calibration test. `fields` says which numeric columns
// apply to that type; the rest stay empty on that record.

export interface CalibrationField {
	key: CalibrationValueKey;
	label: () => string;
	unit?: string;
	step?: number;
}

export interface CalibrationType {
	type: string;
	label: () => string;
	description: () => string;
	fields: CalibrationField[];
	referenceUrl?: string;
}

const wiki = (page: string) => `https://www.orcaslicer.com/wiki/calibration/${page}`;

export const CALIBRATION_TYPES: CalibrationType[] = [
	{
		type: 'temperature',
		label: () => m['calibration.type.temperature'](),
		description: () => m['calibration.desc.temperature'](),
		fields: [{ key: 'nozzle_temp', label: () => m['calibration.field.nozzleTemp'](), unit: '°C' }],
		referenceUrl: wiki('temp_calib')
	},
	{
		type: 'pressure_advance',
		label: () => m['calibration.type.pressureAdvance'](),
		description: () => m['calibration.desc.pressureAdvance'](),
		fields: [{ key: 'pa_value', label: () => m['calibration.field.pa'](), step: 0.001 }],
		referenceUrl: wiki('pressure_advance_calib')
	},
	{
		type: 'adaptive_pa',
		label: () => m['calibration.type.adaptivePa'](),
		description: () => m['calibration.desc.adaptivePa'](),
		fields: [
			{ key: 'pa_value', label: () => m['calibration.field.pa'](), step: 0.001 },
			{ key: 'flow_rate', label: () => m['calibration.field.flow'](), unit: 'mm³/s' },
			{ key: 'acceleration', label: () => m['calibration.field.acceleration'](), unit: 'mm/s²' }
		],
		referenceUrl: wiki('adaptive_pressure_advance_calib')
	},
	{
		type: 'flow_ratio',
		label: () => m['calibration.type.flowRatio'](),
		description: () => m['calibration.desc.flowRatio'](),
		fields: [{ key: 'flow_ratio', label: () => m['calibration.type.flowRatio'](), step: 0.001 }],
		referenceUrl: wiki('flow_ratio_calib')
	},
	{
		type: 'tolerance',
		label: () => m['calibration.type.tolerance'](),
		description: () => m['calibration.desc.tolerance'](),
		fields: [
			{ key: 'tolerance_offset', label: () => m['calibration.field.offset'](), unit: 'mm', step: 0.01 }
		],
		referenceUrl: wiki('tolerance_calib')
	},
	{
		type: 'vfa',
		label: () => m['calibration.type.vfa'](),
		description: () => m['calibration.desc.vfa'](),
		fields: [
			{ key: 'vfa_speed_min', label: () => m['calibration.field.speedMin'](), unit: 'mm/s' },
			{ key: 'vfa_speed_max', label: () => m['calibration.field.speedMax'](), unit: 'mm/s' }
		],
		referenceUrl: wiki('vfa_calib.html')
	},
	{
		type: 'volumetric_speed',
		label: () => m['calibration.type.volumetricSpeed'](),
		description: () => m['calibration.desc.volumetricSpeed'](),
		fields: [{ key: 'max_volumetric_speed', label: () => m['calibration.field.mvs'](), unit: 'mm³/s' }],
		referenceUrl: wiki('volumetric_speed_calib.html')
	},
	{
		type: 'ironing',
		label: () => m['calibration.type.ironing'](),
		description: () => m['calibration.desc.ironing'](),
		fields: [
			{ key: 'ironing_flow', label: () => m['calibration.field.ironingFlow'](), unit: '%' },
			{ key: 'ironing_speed', label: () => m['calibration.field.ironingSpeed'](), unit: 'mm/s' }
		]
	}
];

export function calibrationType(type: string): CalibrationType | undefined {
	return CALIBRATION_TYPES.find((c) => c.type === type);
}

/** "PA: 0.04 · Flow: 12 mm³/s": the values a record holds, in the type's field order. */
export function formatCalibration(record: FilamentCalibration): string {
	const config = calibrationType(record.calibration_type);
	if (!config) return '';
	return config.fields
		.flatMap((f) => {
			const v = record[f.key];
			return v === undefined || v === null ? [] : [`${f.label()}: ${v}${f.unit ? ` ${f.unit}` : ''}`];
		})
		.join(' · ');
}

/** Records grouped by type, keeping the API's order within each group. */
export function groupByType(records: FilamentCalibration[]): Map<string, FilamentCalibration[]> {
	const map = new Map<string, FilamentCalibration[]>();
	for (const r of records) {
		const list = map.get(r.calibration_type) ?? [];
		list.push(r);
		map.set(r.calibration_type, list);
	}
	return map;
}
