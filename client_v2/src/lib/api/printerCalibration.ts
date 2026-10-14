import { deleteResource, getList, patchJson, postJson } from './http';
import { calibrationImageUrl, saveCalibrationImages, type CalibrationImage } from './calibrationImages';

// VFA (resonance) tests recorded per printer (/api/v1/printer-calibration). A test
// records the speed range that makes vertical walls ripple, the speed that prints best, the nozzle it was run
// with, and any number of evidence photos.

export interface PrinterVfa {
	id: number;
	registered: string;
	vfa_speed_min?: number;
	vfa_speed_max?: number;
	/** The speed that gives the best print quality. */
	vfa_speed_best?: number;
	nozzle_size?: number;
	images: CalibrationImage[];
	notes?: string;
}

export interface PrinterVfaInput {
	vfa_speed_min: number;
	vfa_speed_max: number;
	vfa_speed_best: number | null;
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
	calibrationImageUrl('printer-calibration', calibrationId, imageId);

/** Apply a form's photo changes: delete the removed ones, then upload the new ones. */
export const saveVfaImages = (calibrationId: number, removedIds: number[], pending: File[]) =>
	saveCalibrationImages('printer-calibration', calibrationId, removedIds, pending);
