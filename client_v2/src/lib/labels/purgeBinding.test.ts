import { describe, it, expect } from 'vitest';
import { purgeBinding } from './purgeBinding';
import { resolveTemplate } from './template';
import { elementToShape } from './render';
import type { PurgeCalibration } from '$lib/api/purge';
import type { SwatchElement } from './types';

const purge = {
	id: 7,
	registered: '2026-10-18T19:15:48Z',
	from_filament: { id: 1, name: 'High Speed White', color_hex: 'FFFFFF', vendor: { id: 1, name: 'Sunlu' } },
	to_filament: { id: 2, name: 'Matte Ice Blue', color_hex: '99DDFF', vendor: { id: 2, name: 'Elegoo' } },
	purge_volume: 100,
	multiplication_factor: 0,
	nozzle_size: 0.4,
	print_temp: 220
} as unknown as PurgeCalibration;

describe('purge label binding', () => {
	const binding = purgeBinding(purge);

	it('puts the outgoing filament in the usual filament and vendor tokens', () => {
		expect(resolveTemplate('{vendor.name} {filament.name}', binding)).toBe('Sunlu High Speed White');
	});

	it('resolves the purge and the incoming filament', () => {
		expect(resolveTemplate('{filament.name} → {purge.to.name}', binding)).toBe(
			'High Speed White → Matte Ice Blue'
		);
		expect(resolveTemplate('{purge.volume} mm³ · {purge.nozzle} mm · #{purge.id}', binding)).toBe(
			'100 mm³ · 0.4 mm · #7'
		);
		expect(resolveTemplate('{purge.to.vendor}', binding)).toBe('Elegoo');
	});

	it('treats a zero multiplication factor as not set', () => {
		expect(resolveTemplate('{×{purge.factor}}', binding)).toBe('');
	});

	it('colours each swatch from its side of the purge', () => {
		const swatch = (side: SwatchElement['side']): SwatchElement => ({
			id: 's',
			type: 'swatch',
			x: 0,
			y: 0,
			w: 5,
			h: 5,
			radius: 0,
			side
		});
		const fill = (side: SwatchElement['side']) => {
			const spec = elementToShape(swatch(side), { binding, baseUrl: '', kind: 'purge' });
			return spec.kind === 'rect' ? spec.config.fill : undefined;
		};
		expect(fill('from')).toBe('#FFFFFF');
		expect(fill('to')).toBe('#99DDFF');
	});
});
