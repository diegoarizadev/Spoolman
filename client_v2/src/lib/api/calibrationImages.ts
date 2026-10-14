import { API_BASE } from './config';
import { deleteResource } from './http';

// Evidence photos of a calibration record. Printer (VFA) and filament calibrations
// share the same shape: POST adds one image, DELETE removes one by id.

export type CalibrationResource = 'printer-calibration' | 'filament-calibration';

export interface CalibrationImage {
	id: number;
}

export const calibrationImageUrl = (resource: CalibrationResource, calibrationId: number, imageId: number) =>
	`${API_BASE}/${resource}/${calibrationId}/image/${imageId}`;

async function uploadImage(resource: CalibrationResource, calibrationId: number, file: File): Promise<void> {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch(`${API_BASE}/${resource}/${calibrationId}/image`, { method: 'POST', body: form });
	if (!res.ok) throw new Error(`POST ${resource} image → ${res.status}`);
}

/** Apply a form's photo changes: delete the removed ones, then upload the new ones. */
export async function saveCalibrationImages(
	resource: CalibrationResource,
	calibrationId: number,
	removedIds: number[],
	pending: File[]
): Promise<void> {
	for (const id of removedIds) await deleteResource(`/${resource}/${calibrationId}/image/${id}`);
	for (const file of pending) await uploadImage(resource, calibrationId, file);
}
