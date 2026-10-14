import { deleteResource, getJson, getList, HttpError, patchJson, postJson } from './http';
import type { CalibrationImage } from './calibrationImages';

// Per-filament calibration tests (/api/v1/filament-calibration) and the read-only
// manufacturer datasheet values (/api/v1/material-defaults).

export interface FilamentCalibration {
	id: number;
	registered: string;
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
	images: CalibrationImage[];
	notes?: string;
}

/** The numeric columns a calibration type can fill in. */
export type CalibrationValueKey =
	| 'nozzle_temp'
	| 'pa_value'
	| 'flow_rate'
	| 'acceleration'
	| 'flow_ratio'
	| 'tolerance_offset'
	| 'vfa_speed_min'
	| 'vfa_speed_max'
	| 'max_volumetric_speed'
	| 'ironing_flow'
	| 'ironing_speed';

export type FilamentCalibrationInput = Partial<Record<CalibrationValueKey, number>> & {
	notes: string | null;
};

export async function listFilamentCalibrations(
	filamentId: number,
	signal?: AbortSignal
): Promise<FilamentCalibration[]> {
	const page = await getList('/filament-calibration', { filament_id: filamentId }, signal);
	return page.items as FilamentCalibration[];
}

export const createFilamentCalibration = (filamentId: number, type: string, body: FilamentCalibrationInput) =>
	postJson<FilamentCalibration>('/filament-calibration', {
		filament_id: filamentId,
		calibration_type: type,
		...body
	});
export const updateFilamentCalibration = (id: number, body: FilamentCalibrationInput) =>
	patchJson<FilamentCalibration>(`/filament-calibration/${id}`, body);
export const deleteFilamentCalibration = (id: number) => deleteResource(`/filament-calibration/${id}`);

/** Manufacturer-published values; every field is a display string (ranges included). */
export type MaterialDefaults = { brand: string; material: string; type: string } & Record<
	string,
	string | null | undefined
>;

/** The datasheet entry for a vendor + material + type, or null when there is none. */
export async function getMaterialDefaults(
	vendor: string,
	material: string,
	type: string,
	signal?: AbortSignal
): Promise<MaterialDefaults | null> {
	try {
		return await getJson<MaterialDefaults>('/material-defaults', { vendor, material, type }, signal);
	} catch (e) {
		if (e instanceof HttpError && e.status === 404) return null;
		throw e;
	}
}
