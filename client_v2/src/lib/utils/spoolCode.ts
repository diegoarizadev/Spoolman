// Parse the payload of a scanned Spoolman label back into an entity reference.
// Mirrors the forms produced by the QR generator (lib/labels/qr.ts):
//   scheme → WEB+SPOOLMAN:S-<id> / F-<id> / P-<id>           (compact custom URI)
//   url    → <base_url>/spool|filament|purge/show/<id>       (opens in a browser)
// `S`/`spool` codes resolve to a spool, `F`/`filament` to a filament, `P`/`purge` to a purge.
// Anything that isn't a Spoolman code returns null, so unrelated codes in view
// are simply ignored.

const SCHEME_RE = /^web\+spoolman:(?<kind>[sfp])-(?<id>[0-9]+)$/i;
const URL_RE = /^https?:\/\/[^/]+(?:\/[^/]+)*\/(?<kind>spool|filament|purge)\/show\/(?<id>[0-9]+)\/?$/i;

/** A scanned Spoolman code resolved to the entity it points at. */
export interface ScannedRef {
	kind: 'spool' | 'filament' | 'purge';
	id: number;
}

/** Normalise the `kind` capture (`s`/`f` or `spool`/`filament`) to an entity kind. */
function normaliseKind(raw: string): ScannedRef['kind'] {
	const first = raw.toLowerCase()[0];
	return first === 'f' ? 'filament' : first === 'p' ? 'purge' : 'spool';
}

/** Extract the entity reference from a scanned code, or null if it isn't a Spoolman code. */
export function parseSpoolCode(raw: string): ScannedRef | null {
	const text = raw.trim();
	const match = SCHEME_RE.exec(text) ?? URL_RE.exec(text);
	if (!match?.groups) return null;
	const id = Number(match.groups.id);
	if (!Number.isSafeInteger(id)) return null;
	return { kind: normaliseKind(match.groups.kind), id };
}
