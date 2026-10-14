import { describe, expect, it } from 'vitest';
import { fitWithin } from './image';

describe('fitWithin', () => {
	it('leaves a photo that already fits', () => {
		expect(fitWithin(1600, 1200, 2048)).toEqual({ w: 1600, h: 1200 });
	});
	it('scales a landscape photo by its width', () => {
		expect(fitWithin(4000, 3000, 2000)).toEqual({ w: 2000, h: 1500 });
	});
	it('scales a portrait photo by its height', () => {
		expect(fitWithin(3000, 4000, 2000)).toEqual({ w: 1500, h: 2000 });
	});
	it('never returns a zero side', () => {
		expect(fitWithin(10000, 1, 100)).toEqual({ w: 100, h: 1 });
	});
});
