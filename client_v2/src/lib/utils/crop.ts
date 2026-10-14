// Geometry of the crop rectangle shown over a photo. All numbers are in the pixels of
// the displayed image (W x H); converting to the photo's real resolution is `toNatural`.

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** Smallest side a crop may have, so it can't collapse to nothing. */
export const MIN_SIDE = 16;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** The rectangle that fits inside W x H: sides at least `min`, fully on the image. */
export function clampRect(r: Rect, W: number, H: number, min = MIN_SIDE): Rect {
	const w = clamp(r.w, Math.min(min, W), W);
	const h = clamp(r.h, Math.min(min, H), H);
	return { x: clamp(r.x, 0, W - w), y: clamp(r.y, 0, H - h), w, h };
}

/** Slide the rectangle by (dx, dy), keeping it on the image. */
export function moveRect(r: Rect, dx: number, dy: number, W: number, H: number): Rect {
	return { ...r, x: clamp(r.x + dx, 0, W - r.w), y: clamp(r.y + dy, 0, H - r.h) };
}

/** Drag one handle by (dx, dy): the opposite edges stay put. */
export function resizeRect(
	r: Rect,
	handle: Handle,
	dx: number,
	dy: number,
	W: number,
	H: number,
	min = MIN_SIDE
): Rect {
	let left = r.x;
	let top = r.y;
	let right = r.x + r.w;
	let bottom = r.y + r.h;
	if (handle.includes('w')) left = clamp(left + dx, 0, right - min);
	if (handle.includes('e')) right = clamp(right + dx, left + min, W);
	if (handle.includes('n')) top = clamp(top + dy, 0, bottom - min);
	if (handle.includes('s')) bottom = clamp(bottom + dy, top + min, H);
	return { x: left, y: top, w: right - left, h: bottom - top };
}

/** A rectangle from two corner points in any order (drawing a fresh crop by dragging). */
export function rectFromPoints(x0: number, y0: number, x1: number, y1: number, W: number, H: number): Rect {
	const left = clamp(Math.min(x0, x1), 0, W);
	const top = clamp(Math.min(y0, y1), 0, H);
	const right = clamp(Math.max(x0, x1), 0, W);
	const bottom = clamp(Math.max(y0, y1), 0, H);
	return { x: left, y: top, w: right - left, h: bottom - top };
}

/** Scale a displayed-pixel rectangle up to the photo's own resolution (whole pixels). */
export function toNatural(
	r: Rect,
	displayW: number,
	displayH: number,
	naturalW: number,
	naturalH: number
): Rect {
	const sx = naturalW / displayW;
	const sy = naturalH / displayH;
	return {
		x: Math.round(r.x * sx),
		y: Math.round(r.y * sy),
		w: Math.max(1, Math.round(r.w * sx)),
		h: Math.max(1, Math.round(r.h * sy))
	};
}

/** The starting crop: the middle 80% of the image, as the old client did. */
export function defaultRect(W: number, H: number): Rect {
	return { x: W * 0.1, y: H * 0.1, w: W * 0.8, h: H * 0.8 };
}
