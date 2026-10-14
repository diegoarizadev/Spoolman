// Phone cameras produce photos of several MB and 12+ megapixels. Shrinking them before
// they are attached keeps uploads small and fast over a LAN or a reverse proxy.

/** Longest side, in pixels, a stored photo may have. */
export const MAX_PHOTO_SIDE = 2048;

/** Size to draw an image of `w`×`h` at so its longest side is at most `max`. */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
	const longest = Math.max(w, h);
	if (longest <= max) return { w, h };
	const scale = max / longest;
	return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/**
 * The photo scaled down to `max` px on its longest side. Smaller photos and anything the
 * browser cannot decode come back untouched, so this never loses a photo.
 */
export async function downscale(file: File, max = MAX_PHOTO_SIDE): Promise<File> {
	try {
		const bitmap = await createImageBitmap(file);
		const { w, h } = fitWithin(bitmap.width, bitmap.height, max);
		if (w === bitmap.width && h === bitmap.height) {
			bitmap.close();
			return file;
		}
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		canvas.getContext('2d')?.drawImage(bitmap, 0, 0, w, h);
		bitmap.close();
		const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
		if (!blob) return file;
		const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
		return new File([blob], `${base}.${type === 'image/png' ? 'png' : 'jpg'}`, { type });
	} catch {
		return file;
	}
}
