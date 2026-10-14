import { describe, expect, it } from 'vitest';
import { applyOrder, moveItem, parseOrder, splitList, textColorFor } from './ams';

describe('parseOrder', () => {
	it('reads a JSON array of ids', () => expect(parseOrder('[3,1,2]')).toEqual([3, 1, 2]));
	it('treats missing or broken input as empty', () => {
		expect(parseOrder(undefined)).toEqual([]);
		expect(parseOrder('nope')).toEqual([]);
		expect(parseOrder('{"a":1}')).toEqual([]);
	});
	it('drops non-numbers', () => expect(parseOrder('[1,"x",2]')).toEqual([1, 2]));
});

describe('applyOrder', () => {
	const spools = [{ id: 1 }, { id: 2 }, { id: 3 }];
	it('follows the saved order', () => expect(applyOrder(spools, [3, 1]).map((s) => s.id)).toEqual([3, 1, 2]));
	it('ignores ids that are gone', () =>
		expect(applyOrder(spools, [9, 2]).map((s) => s.id)).toEqual([2, 1, 3]));
});

describe('moveItem', () => {
	it('moves forward and backward', () => {
		expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
		expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2]);
	});
	it('returns the same list for a no-op or bad index', () => {
		const list = [1, 2];
		expect(moveItem(list, 1, 1)).toBe(list);
		expect(moveItem(list, 5, 0)).toBe(list);
	});
});

describe('textColorFor', () => {
	it('picks contrast', () => {
		expect(textColorFor('ffffff')).toBe('#000');
		expect(textColorFor('000000')).toBe('#fff');
		expect(textColorFor(undefined)).toBe('#fff');
	});
});

describe('splitList', () => {
	it('trims and drops blanks', () => expect(splitList('a, b ,,c')).toEqual(['a', 'b', 'c']));
	it('handles empty', () => expect(splitList(undefined)).toEqual([]));
});
