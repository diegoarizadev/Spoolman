import { describe, expect, it } from 'vitest';
import { filamentTipo } from './tipo';

describe('filamentTipo', () => {
	it('decodes a JSON string', () => expect(filamentTipo({ tipo: '"Matte"' })).toBe('Matte'));
	it('takes plain text as typed', () => expect(filamentTipo({ tipo: 'High Speed' })).toBe('High Speed'));
	it('is undefined when missing or empty', () => {
		expect(filamentTipo({})).toBeUndefined();
		expect(filamentTipo(undefined)).toBeUndefined();
		expect(filamentTipo({ tipo: '""' })).toBeUndefined();
	});
	it('ignores non-text JSON', () => expect(filamentTipo({ tipo: '12' })).toBeUndefined());
});
