import { API_BASE } from './config';
import { deleteResource, getJson, getList, patchJson, postJson } from './http';

// Printer catalog (/api/v1/printer): hardware specs, plus which location acts as the
// printer's AMS and in which order its slots are shown.

export interface Printer {
	id: number;
	registered: string;
	manufacturer: string;
	model: string;
	build_volume_x?: number;
	build_volume_y?: number;
	build_volume_z?: number;
	nozzle_diameters?: string;
	max_hotend_temp?: number;
	max_bed_temp?: number;
	chamber_enclosed: boolean;
	chamber_heated: boolean;
	chamber_max_temp?: number;
	ams_compatible: boolean;
	ams_units?: string;
	print_heads?: number;
	colors_supported?: number;
	supported_materials?: string;
	max_print_speed?: number;
	max_acceleration?: number;
	physical_width?: number;
	physical_depth?: number;
	physical_height?: number;
	net_weight?: number;
	voltage?: string;
	frequency?: string;
	max_power?: number;
	connectivity?: string;
	sku?: string;
	image_path?: string;
	ams_location?: string;
	ams_slot_order?: string;
	comment?: string;
}

/** What the form edits: everything but the server-assigned fields. */
export type PrinterInput = Partial<Omit<Printer, 'id' | 'registered' | 'image_path'>> &
	Pick<Printer, 'manufacturer' | 'model'>;

/** A spool as the AMS view needs it. */
export interface AmsSpool {
	id: number;
	location?: string;
	filament: {
		id: number;
		name?: string;
		material?: string;
		color_hex?: string;
		multi_color_hexes?: string;
		vendor?: { id: number; name: string };
	};
}

export async function listPrinters(
	params: { sort?: string; limit?: number; offset?: number },
	signal?: AbortSignal
): Promise<{ items: Printer[]; total: number }> {
	const page = await getList('/printer', params, signal);
	return { items: page.items as Printer[], total: page.total };
}

export const getPrinter = (id: number, signal?: AbortSignal) =>
	getJson<Printer>(`/printer/${id}`, {}, signal);
export const createPrinter = (body: PrinterInput) => postJson<Printer>('/printer', body);
export const updatePrinter = (id: number, body: Partial<Record<keyof Printer, unknown>>) =>
	patchJson<Printer>(`/printer/${id}`, body);
export const deletePrinter = (id: number) => deleteResource(`/printer/${id}`);

export async function uploadPrinterImage(id: number, file: File): Promise<Printer> {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch(`${API_BASE}/printer/${id}/image`, { method: 'POST', body: form });
	if (!res.ok) throw new Error(`POST /printer/${id}/image → ${res.status}`);
	return (await res.json()) as Printer;
}

export const printerImageUrl = (id: number) => `${API_BASE}/printer/${id}/image`;

export const printerName = (p: Pick<Printer, 'manufacturer' | 'model'>) => `${p.manufacturer} ${p.model}`;

export const listLocations = (signal?: AbortSignal) => getJson<string[]>('/location', {}, signal);

/** Spools stored exactly at `location` (the API filter is a partial match). */
export async function listSpoolsAt(location: string, signal?: AbortSignal): Promise<AmsSpool[]> {
	const page = await getList('/spool', { location }, signal);
	return (page.items as AmsSpool[]).filter((s) => s.location === location);
}
