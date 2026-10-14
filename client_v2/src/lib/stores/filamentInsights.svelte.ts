import { SvelteMap } from 'svelte/reactivity';
import { getList } from '$lib/api/http';
import { getMaterialDefaults, type MaterialDefaults } from '$lib/api/filamentCalibration';

// What the filament catalog shows beside each filament beyond its own fields: which
// calibration tests have been recorded for it, and the manufacturer's published values.
// Both are fetched for the whole list at once (every calibration in one request, each
// distinct vendor + material + type once), not once per row.

const key = (vendor: string, material: string, tipo: string) => `${vendor}|${material}|${tipo}`;

class FilamentInsights {
	/** filament id → the calibration types recorded for it, in first-seen order. */
	#types = $state<Record<number, string[]>>({});
	/** vendor|material|tipo → its datasheet entry, or null when there is none. */
	#defaults = new SvelteMap<string, MaterialDefaults | null>();
	#asked = new Set<string>();
	#loading = false;
	#loaded = false;

	/** Calibration types recorded for a filament (empty until loaded). */
	typesFor(filamentId: number): string[] {
		return this.#types[filamentId] ?? [];
	}

	/** The datasheet entry once fetched: null = none exists, undefined = not fetched yet. */
	defaultsFor(vendor: string, material: string, tipo: string): MaterialDefaults | null | undefined {
		return this.#defaults.get(key(vendor, material, tipo));
	}

	/** Load every calibration once; `force` reloads after one was added or removed. */
	async loadCalibrations(force = false) {
		if (this.#loading || (this.#loaded && !force)) return;
		this.#loading = true;
		try {
			const page = await getList('/filament-calibration');
			const map: Record<number, string[]> = {};
			for (const item of page.items as { filament?: { id: number }; calibration_type: string }[]) {
				const id = item.filament?.id;
				if (id === undefined) continue;
				const list = map[id] ?? [];
				if (!list.includes(item.calibration_type)) list.push(item.calibration_type);
				map[id] = list;
			}
			this.#types = map;
			this.#loaded = true;
		} catch {
			// A decoration of the list: when it can't load, the rows simply show less.
		} finally {
			this.#loading = false;
		}
	}

	/** Fetch a datasheet entry the first time it is asked for. */
	ensureDefaults(vendor: string | undefined, material: string | undefined, tipo: string | undefined) {
		if (!vendor || !material || !tipo) return;
		const k = key(vendor, material, tipo);
		if (this.#asked.has(k)) return;
		this.#asked.add(k);
		getMaterialDefaults(vendor, material, tipo)
			.then((d) => this.#defaults.set(k, d))
			.catch(() => this.#asked.delete(k));
	}
}

export const filamentInsights = new FilamentInsights();
