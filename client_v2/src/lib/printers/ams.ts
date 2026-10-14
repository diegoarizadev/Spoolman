// Ordering of the spools shown as a printer's AMS slots (A1..An).

/** The saved slot order: a JSON array of spool ids. Anything else reads as empty. */
export function parseOrder(raw?: string | null): number[] {
	try {
		const parsed: unknown = JSON.parse(raw ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
	} catch {
		return [];
	}
}

/** Saved order first (dropping spools no longer there), then any new spools in the location. */
export function applyOrder<T extends { id: number }>(spools: T[], order: number[]): T[] {
	const byId = new Map(spools.map((s) => [s.id, s]));
	const ordered = order.map((id) => byId.get(id)).filter((s): s is T => s !== undefined);
	const seen = new Set(ordered.map((s) => s.id));
	return [...ordered, ...spools.filter((s) => !seen.has(s.id))];
}

/** Move the item at `from` so it ends up at `to`. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
	if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
	const next = [...items];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}

/** Black or white, whichever reads better on a `rrggbb` background. */
export function textColorFor(hex?: string): string {
	if (!hex || hex.length < 6) return '#fff';
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#000' : '#fff';
}

/** "a, b ,,c" → ["a","b","c"]; for the comma-separated printer fields. */
export function splitList(raw?: string | null): string[] {
	return (raw ?? '')
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean);
}
