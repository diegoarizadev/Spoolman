import { describe, expect, it } from 'vitest';
import { clampRect, defaultRect, moveRect, rectFromPoints, resizeRect, toNatural } from './crop';

describe('clampRect', () => {
	it('keeps a rect on the image', () =>
		expect(clampRect({ x: 90, y: -5, w: 50, h: 20 }, 100, 100)).toEqual({ x: 50, y: 0, w: 50, h: 20 }));
	it('enforces a minimum size', () => expect(clampRect({ x: 0, y: 0, w: 2, h: 2 }, 100, 100, 16).w).toBe(16));
	it('never exceeds the image', () =>
		expect(clampRect({ x: 0, y: 0, w: 500, h: 500 }, 100, 80)).toMatchObject({ w: 100, h: 80 }));
});

describe('moveRect', () => {
	it('moves within bounds', () =>
		expect(moveRect({ x: 10, y: 10, w: 30, h: 30 }, 5, -3, 100, 100)).toEqual({ x: 15, y: 7, w: 30, h: 30 }));
	it('stops at the edges', () => {
		expect(moveRect({ x: 10, y: 10, w: 30, h: 30 }, 500, 500, 100, 100)).toEqual({
			x: 70,
			y: 70,
			w: 30,
			h: 30
		});
		expect(moveRect({ x: 10, y: 10, w: 30, h: 30 }, -500, -500, 100, 100)).toEqual({
			x: 0,
			y: 0,
			w: 30,
			h: 30
		});
	});
});

describe('resizeRect', () => {
	const r = { x: 20, y: 20, w: 40, h: 40 };
	it('se grows right and down, keeping the top-left', () =>
		expect(resizeRect(r, 'se', 10, 5, 100, 100)).toEqual({ x: 20, y: 20, w: 50, h: 45 }));
	it('nw moves the top-left, keeping the bottom-right', () =>
		expect(resizeRect(r, 'nw', -10, -10, 100, 100)).toEqual({ x: 10, y: 10, w: 50, h: 50 }));
	it('an edge handle only changes one axis', () =>
		expect(resizeRect(r, 'e', 10, 99, 100, 100)).toEqual({ x: 20, y: 20, w: 50, h: 40 }));
	it('cannot collapse below the minimum', () =>
		expect(resizeRect(r, 'w', 500, 0, 100, 100, 16)).toEqual({ x: 44, y: 20, w: 16, h: 40 }));
	it('cannot leave the image', () =>
		expect(resizeRect(r, 'se', 500, 500, 100, 100)).toEqual({ x: 20, y: 20, w: 80, h: 80 }));
});

describe('rectFromPoints', () => {
	it('orders the corners', () =>
		expect(rectFromPoints(50, 60, 10, 20, 100, 100)).toEqual({ x: 10, y: 20, w: 40, h: 40 }));
	it('clips to the image', () =>
		expect(rectFromPoints(-10, -10, 500, 50, 100, 100)).toEqual({ x: 0, y: 0, w: 100, h: 50 }));
});

describe('toNatural', () => {
	it('scales to the photo resolution', () =>
		expect(toNatural({ x: 10, y: 20, w: 50, h: 40 }, 100, 100, 400, 200)).toEqual({
			x: 40,
			y: 40,
			w: 200,
			h: 80
		}));
});

describe('defaultRect', () => {
	it('is the middle 80%', () => expect(defaultRect(200, 100)).toEqual({ x: 20, y: 10, w: 160, h: 80 }));
});
