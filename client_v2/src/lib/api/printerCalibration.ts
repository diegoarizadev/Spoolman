import { API_BASE } from './config';
import { deleteResource, getList, patchJson, postJson } from './http';

// VFA (resonance) tests recorded per printer (/api/v1/printer-calibration). A test
// records the speed range that makes vertical walls ripple, the nozzle it was run
// with, and any number of evidence photos.

export interface CalibrationImage {
	id: number;
}

export interface PrinterVfa {
	id: number;
	registered: string;
	vfa_speed_min?: number;
	vfa_speed_max?: number;
	nozzle_size?: number;
	images: CalibrationImage[];
	notes?: string;
}

export interface PrinterVfaInput {
	vfa_speed_min: number;
	vfa_speed_max: number;
	nozzle_size: number | null;
	notes: string | null;
}

export async function listPrinterVfa(printerId: number, signal?: AbortSignal): Promise<PrinterVfa[]> {
	const page = await getList('/printer-calibration', { printer_id: printerId }, signal);
	return page.items as PrinterVfa[];
}

export const createPrinterVfa = (printerId: number, body: PrinterVfaInput) =>
	postJson<PrinterVfa>('/printer-calibration', { printer_id: printerId, ...body });
export const updatePrinterVfa = (id: number, body: PrinterVfaInput) =>
	patchJson<PrinterVfa>(`/printer-calibration/${id}`, body);
export const deletePrinterVfa = (id: number) => deleteResource(`/printer-calibration/${id}`);

export const vfaImageUrl = (calibrationId: number, imageId: number) =>
	`${API_BASE}/printer-calibration/${calibrationId}/image/${imageId}`;

export async function uploadVfaImage(calibrationId: number, file: File): Promise<void> {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch(`${API_BASE}/printer-calibration/${calibrationId}/image`, {
		method: 'POST',
		body: form
	});
	if (!res.ok) throw new Error(`POST image → ${res.status}`);
}

export const deleteVfaImage = (calibrationId: number, imageId: number) =>
	deleteResource(`/printer-calibration/${calibrationId}/image/${imageId}`);

/** Apply a form's photo changes: delete the removed ones, then upload the new ones. */
export async function saveVfaImages(
	calibrationId: number,
	removedIds: number[],
	pending: File[]
): Promise<void> {
	for (const id of removedIds) await deleteVfaImage(calibrationId, id);
	for (const file of pending) await uploadVfaImage(calibrationId, file);
}
