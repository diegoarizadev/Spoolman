import { API_BASE } from './config';
import { deleteResource, getJson, getList, patchJson, postJson, type QueryParams } from './http';
import { getSettings, parseSetting } from './settings';

// Purge library (/api/v1/purge): how much filament to purge when going from one
// filament to another, measured with a real test print.

export interface PurgeVendor {
	id: number;
	name: string;
	[key: string]: unknown;
}

export interface PurgeFilament {
	id: number;
	[key: string]: unknown;
	name?: string;
	material?: string;
	color_hex?: string;
	multi_color_hexes?: string;
	vendor?: PurgeVendor;
}

export interface PurgeCalibration {
	id: number;
	registered: string;
	from_filament: PurgeFilament;
	to_filament: PurgeFilament;
	purge_volume: number;
	multiplication_factor: number;
	nozzle_size: number;
	print_temp: number;
	image_path?: string;
	comment?: string;
}

export interface PurgeInput {
	from_filament_id: number;
	to_filament_id: number;
	purge_volume: number;
	multiplication_factor: number;
	nozzle_size: number;
	print_temp: number;
	comment?: string | null;
}

export interface PurgePage {
	items: PurgeCalibration[];
	total: number;
}

export async function listPurges(
	params: {
		sort?: string;
		limit?: number;
		offset?: number;
		from_filament_id?: number;
		to_filament_id?: number;
	},
	signal?: AbortSignal
): Promise<PurgePage> {
	const page = await getList('/purge', params as QueryParams, signal);
	return { items: page.items as PurgeCalibration[], total: page.total };
}

export const getPurge = (id: number, signal?: AbortSignal) =>
	getJson<PurgeCalibration>(`/purge/${id}`, {}, signal);
export const createPurge = (body: PurgeInput) => postJson<PurgeCalibration>('/purge', body);
export const updatePurge = (id: number, body: Partial<PurgeInput>) =>
	patchJson<PurgeCalibration>(`/purge/${id}`, body);
export const deletePurge = (id: number) => deleteResource(`/purge/${id}`);

export async function uploadPurgeImage(id: number, file: File): Promise<PurgeCalibration> {
	const form = new FormData();
	form.append('file', file);
	const res = await fetch(`${API_BASE}/purge/${id}/image`, { method: 'POST', body: form });
	if (!res.ok) throw new Error(`POST /purge/${id}/image → ${res.status}`);
	return (await res.json()) as PurgeCalibration;
}

export const purgeImageUrl = (id: number) => `${API_BASE}/purge/${id}/image`;

/** Every filament, for the pickers. The API pages nothing here, so one request. */
export async function listFilamentsForPurge(signal?: AbortSignal): Promise<PurgeFilament[]> {
	const page = await getList('/filament', { sort: 'name:asc' }, signal);
	return page.items as PurgeFilament[];
}

export interface PurgeSettings {
	nozzleSizes: number[];
	volumeLow: number;
	volumeHigh: number;
	maxMatrixFilaments: number;
}

export async function loadPurgeSettings(signal?: AbortSignal): Promise<PurgeSettings> {
	const s = await getSettings(signal);
	return {
		nozzleSizes: parseSetting<number[]>(s.purge_nozzle_sizes, [0.4, 0.2]),
		volumeLow: parseSetting<number>(s.purge_volume_low, 50),
		volumeHigh: parseSetting<number>(s.purge_volume_high, 500),
		maxMatrixFilaments: parseSetting<number>(s.purge_matrix_max_filaments, 6)
	};
}

/** "Vendor - Name", falling back to the id for an unnamed filament. */
export function purgeFilamentLabel(f: PurgeFilament): string {
	const base = f.name ?? `#${f.id}`;
	return f.vendor?.name ? `${f.vendor.name} - ${base}` : base;
}

export function purgeFilamentColor(f: PurgeFilament): string | undefined {
	const hex = f.multi_color_hexes ? f.multi_color_hexes.split(',')[0] : f.color_hex;
	return hex ? '#' + hex.replace(/^#/, '') : undefined;
}
