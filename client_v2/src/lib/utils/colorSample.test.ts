import { describe, expect, it } from 'vitest';
import { averageColor, rgbToHex, sampleRect } from './colorSample';

describe('rgbToHex', () => {
	it('formats upper-case and pads', () => expect(rgbToHex(255, 0, 10)).toBe('FF000A'));
	it('rounds and clamps', () => expect(rgbToHex(254.6, -5, 300)).toBe('FF00FF'));
});

describe('averageColor', () => {
	it('averages the pixels', () => {
		// red (255,0,0) and blue (0,0,255), alpha ignored
		expect(averageColor([255, 0, 0, 255, 0, 0, 255, 255])).toBe('80 0080'.replace(' ', ''));
	});
	it('is null with no pixels', () => expect(averageColor([])).toBeNull());
	it('ignores a trailing partial pixel', () => expect(averageColor([10, 20, 30, 255, 99])).toBe('0A141E'));
});

describe('sampleRect', () => {
	it('is centred inside the image', () =>
		expect(sampleRect(50, 40, 100, 100, 8)).toEqual({ left: 42, top: 32, w: 16, h: 16 }));
	it('clips at the top-left corner', () =>
		expect(sampleRect(2, 3, 100, 100, 8)).toEqual({ left: 0, top: 0, w: 16, h: 16 }));
	it('clips at the bottom-right corner', () =>
		expect(sampleRect(99, 99, 100, 100, 8)).toEqual({ left: 91, top: 91, w: 9, h: 9 }));
	it('never returns an empty rect', () =>
		expect(sampleRect(500, 500, 100, 100, 8).w).toBeGreaterThanOrEqual(1));
});
