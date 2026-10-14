import { describe, expect, it } from 'vitest';
import type { FilamentCalibration } from '$lib/api/filamentCalibration';
import { CALIBRATION_TYPES, calibrationType, formatCalibration, groupByType } from './types';

const rec = (over: Partial<FilamentCalibration>): FilamentCalibration => ({
	id: 1,
	registered: '2026-10-14T00:00:00Z',
	calibration_type: 'temperature',
	images: [],
	...over
});

describe('calibration types', () => {
	it('has the eight OrcaSlicer tests with unique ids', () => {
		expect(CALIBRATION_TYPES).toHaveLength(8);
		expect(new Set(CALIBRATION_TYPES.map((c) => c.type)).size).toBe(8);
	});
	it('every type has at least one field', () => {
		for (const c of CALIBRATION_TYPES) expect(c.fields.length).toBeGreaterThan(0);
	});
	it('finds a type by id', () => {
		expect(calibrationType('vfa')?.fields.map((f) => f.key)).toEqual(['vfa_speed_min', 'vfa_speed_max']);
		expect(calibrationType('nope')).toBeUndefined();
	});
});

describe('formatCalibration', () => {
	it('joins the values with units', () => {
		const text = formatCalibration(
			rec({ calibration_type: 'adaptive_pa', pa_value: 0.04, flow_rate: 12, acceleration: 5000 })
		);
		expect(text).toContain('0.04');
		expect(text).toContain('12 mm³/s');
		expect(text).toContain('5000 mm/s²');
	});
	it('skips fields the record does not have', () => {
		expect(formatCalibration(rec({ calibration_type: 'ironing', ironing_flow: 10 }))).not.toContain('mm/s');
	});
	it('is empty for an unknown type', () => {
		expect(formatCalibration(rec({ calibration_type: 'nope' }))).toBe('');
	});
});

describe('groupByType', () => {
	it('groups by calibration_type keeping order', () => {
		const g = groupByType([rec({ id: 1 }), rec({ id: 2, calibration_type: 'vfa' }), rec({ id: 3 })]);
		expect(g.get('temperature')?.map((r) => r.id)).toEqual([1, 3]);
		expect(g.get('vfa')?.map((r) => r.id)).toEqual([2]);
	});
});
