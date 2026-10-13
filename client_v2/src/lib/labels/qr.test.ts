import { describe, it, expect } from 'vitest';
import { qrContent, qrTemplate } from './qr';
import type { QrElement } from './types';
import type { LabelBinding } from './template';

const qr = (urlTemplate: string): QrElement => ({
	id: 'q',
	type: 'qr',
	x: 0,
	y: 0,
	size: 10,
	ec: 'H',
	encoding: 'custom',
	urlTemplate,
	logo: false
});

describe('qrContent custom template', () => {
	const binding = { spool: { id: 7, lot: 'L1' }, filament: { id: 42 } } as unknown as LabelBinding;

	it('resolves label fields so a spool label can link to its filament (#1152)', () => {
		const el = qr('http://host/filament/show/{filament.id}?spool={id}&lot={spool.lot}');
		expect(qrContent(el, 7, { baseUrl: '' }, binding)).toBe('http://host/filament/show/42?spool=7&lot=L1');
	});

	it('still substitutes {id} without a binding', () => {
		expect(qrContent(qr('x/{id}'), 7, { baseUrl: '' })).toBe('x/7');
	});
});

describe('qrContent for purge labels', () => {
	const el = (encoding: QrElement['encoding']): QrElement => ({ ...qr(''), encoding });

	it('uses the P prefix in the compact scheme', () => {
		expect(qrContent(el('scheme'), 5, { baseUrl: '', kind: 'purge' })).toBe('WEB+SPOOLMAN:P-5');
	});

	it('links to the purge page in the url form', () => {
		expect(qrContent(el('url'), 5, { baseUrl: 'http://host/', kind: 'purge' })).toBe(
			'http://host/purge/show/5'
		);
		expect(qrTemplate(el('url'), { baseUrl: 'http://host', kind: 'purge' })).toBe(
			'http://host/purge/show/{id}'
		);
	});
});
