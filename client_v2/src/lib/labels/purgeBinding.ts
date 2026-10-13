import type { PurgeCalibration } from '$lib/api/purge';
import { mapFilament, mapVendor } from '$lib/api/map';
import { formatShortDate } from '$lib/utils/datetime';
import type { LabelBinding } from './template';

/**
 * What a purge label resolves its fields against. The outgoing filament and its
 * manufacturer fill the binding's own `filament`/`vendor` — so the same `{filament.*}`
 * tokens work on every kind of label — and the incoming pair sits under `purge`.
 */
export function purgeBinding(p: PurgeCalibration): LabelBinding {
	return {
		filament: mapFilament(p.from_filament),
		vendor: p.from_filament.vendor ? mapVendor(p.from_filament.vendor) : undefined,
		purge: {
			id: p.id,
			volume: p.purge_volume,
			factor: p.multiplication_factor,
			nozzle: p.nozzle_size,
			temp: p.print_temp,
			comment: p.comment ?? undefined,
			registeredLabel: formatShortDate(p.registered),
			to: mapFilament(p.to_filament),
			toVendor: p.to_filament.vendor ? mapVendor(p.to_filament.vendor) : undefined
		}
	};
}
