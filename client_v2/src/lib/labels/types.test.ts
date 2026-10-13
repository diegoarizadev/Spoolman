import { describe, it, expect } from 'vitest';
import {
	newDesign,
	setDesignKind,
	DEFAULT_SPOOL_TEXT,
	DEFAULT_FILAMENT_TEXT,
	DEFAULT_PURGE_TEXT,
	DEFAULT_PURGE_NAME,
	type LabelDesign,
	type TextElement,
	type SwatchElement
} from './types';

function templates(d: LabelDesign): string[] {
	return d.elements.filter((e): e is TextElement => e.type === 'text').map((e) => e.template);
}

describe('setDesignKind', () => {
	it('retargets the default id line of a fresh design', () => {
		const d = newDesign('x');
		setDesignKind(d, 'filament');
		expect(d.kind).toBe('filament');
		expect(templates(d)).toContain(DEFAULT_FILAMENT_TEXT);
		expect(templates(d)).not.toContain(DEFAULT_SPOOL_TEXT);

		setDesignKind(d, 'spool');
		expect(templates(d)).toContain(DEFAULT_SPOOL_TEXT);
	});

	it('retargets the pre-redesign default too', () => {
		const legacy = '**{filament.name}**\n{filament.material}\n#{spool.id}';
		const d = newDesign('x');
		d.elements = [{ ...(d.elements[1] as TextElement), template: legacy }];
		setDesignKind(d, 'filament');
		expect(templates(d)).toEqual(['**{filament.name}**\n{filament.material}\n#{filament.id}']);
	});

	it('leaves user-edited templates alone', () => {
		const d = newDesign('x');
		d.elements = [{ ...(d.elements[1] as TextElement), template: 'my own #{spool.id}' }];
		setDesignKind(d, 'filament');
		expect(templates(d)).toEqual(['my own #{spool.id}']);
	});
});

describe('purge label kind', () => {
	const swatches = (d: LabelDesign) => d.elements.filter((e): e is SwatchElement => e.type === 'swatch');

	it('retargets the headline and the id line', () => {
		const d = newDesign('x');
		setDesignKind(d, 'purge');
		expect(d.kind).toBe('purge');
		expect(templates(d)).toContain(DEFAULT_PURGE_TEXT);
		expect(templates(d)).toContain(DEFAULT_PURGE_NAME);
		expect(templates(d)).not.toContain(DEFAULT_SPOOL_TEXT);
	});

	it('shrinks the headline for two names and restores it on the way out', () => {
		const d = newDesign('x');
		const headline = () =>
			d.elements.find((e) => e.type === 'text' && e.template.includes('filament.name')) as TextElement;
		expect(headline().fontSize).toBe(3.2);
		setDesignKind(d, 'purge');
		expect(headline().fontSize).toBe(2.4);
		setDesignKind(d, 'spool');
		expect(headline().fontSize).toBe(3.2);
	});

	it('splits the swatch into an outgoing and an incoming half', () => {
		const d = newDesign('x');
		const [original] = swatches(d);
		setDesignKind(d, 'purge');
		const [from, to] = swatches(d);
		expect(from.side).toBe('from');
		expect(to.side).toBe('to');
		// Together they still fill the original swatch, minus the gap between them.
		expect(to.x + to.w).toBeCloseTo(original.x + original.w);
		expect(from.w).toBeCloseTo(to.w);
	});

	it('restores the single swatch when leaving the purge kind', () => {
		const d = newDesign('x');
		const [original] = swatches(d);
		setDesignKind(d, 'purge');
		setDesignKind(d, 'spool');
		const after = swatches(d);
		expect(after).toHaveLength(1);
		expect(after[0].side).toBeUndefined();
		expect(after[0].x).toBeCloseTo(original.x);
		expect(after[0].w).toBeCloseTo(original.w);
	});

	it('does not split a swatch twice', () => {
		const d = newDesign('x');
		setDesignKind(d, 'purge');
		setDesignKind(d, 'purge');
		expect(swatches(d)).toHaveLength(2);
	});
});
