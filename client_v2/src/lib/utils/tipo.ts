import type { Extra } from '$lib/types';

/**
 * A filament's "tipo" (Basic, Matte, High Speed...), the custom field that selects its
 * manufacturer datasheet entry. Extra values are stored JSON-encoded ('"Matte"'); a
 * value that isn't valid JSON is taken as typed. Undefined when unset or not text.
 */
export function filamentTipo(extra: Extra | undefined): string | undefined {
	const raw = extra?.tipo;
	if (!raw) return undefined;
	try {
		const v: unknown = JSON.parse(raw);
		return typeof v === 'string' && v !== '' ? v : undefined;
	} catch {
		return raw;
	}
}
