// Sampling a colour from a photo: the average of a small square around the clicked
// point, so one noisy pixel (compression, sensor grain) doesn't decide the colour.

/** Half-side of the sampled square, in image pixels. */
export const SAMPLE_RADIUS = 8;

/** "RRGGBB" in upper case, each channel rounded and clamped to 0-255. */
export function rgbToHex(r: number, g: number, b: number): string {
	return [r, g, b]
		.map((v) =>
			Math.min(255, Math.max(0, Math.round(v)))
				.toString(16)
				.padStart(2, '0')
		)
		.join('')
		.toUpperCase();
}

/** The square to read: centred on (x, y), clipped to a width x height image. */
export function sampleRect(
	x: number,
	y: number,
	width: number,
	height: number,
	radius = SAMPLE_RADIUS
): { left: number; top: number; w: number; h: number } {
	const left = Math.min(Math.max(0, x - radius), Math.max(0, width - 1));
	const top = Math.min(Math.max(0, y - radius), Math.max(0, height - 1));
	return {
		left,
		top,
		w: Math.max(1, Math.min(width - left, radius * 2)),
		h: Math.max(1, Math.min(height - top, radius * 2))
	};
}

/** Average RGBA pixel data (as from getImageData) to a hex colour; null when empty. */
export function averageColor(data: ArrayLike<number>): string | null {
	const count = Math.floor(data.length / 4);
	if (count === 0) return null;
	let r = 0;
	let g = 0;
	let b = 0;
	for (let i = 0; i < count * 4; i += 4) {
		r += data[i];
		g += data[i + 1];
		b += data[i + 2];
	}
	return rgbToHex(r / count, g / count, b / count);
}
