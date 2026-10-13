import { describe, it, expect } from 'vitest';
import { parseSpoolCode } from './spoolCode';

describe('parseSpoolCode', () => {
	it('reads spool, filament and purge scheme codes', () => {
		expect(parseSpoolCode('WEB+SPOOLMAN:S-12')).toEqual({ kind: 'spool', id: 12 });
		expect(parseSpoolCode('web+spoolman:F-3')).toEqual({ kind: 'filament', id: 3 });
		expect(parseSpoolCode('WEB+SPOOLMAN:P-9')).toEqual({ kind: 'purge', id: 9 });
	});

	it('reads the browser links, including under a base path', () => {
		expect(parseSpoolCode('https://host/spool/show/4')).toEqual({ kind: 'spool', id: 4 });
		expect(parseSpoolCode('https://host/sub/purge/show/8/')).toEqual({ kind: 'purge', id: 8 });
	});

	it('ignores anything else', () => {
		expect(parseSpoolCode('WEB+SPOOLMAN:X-1')).toBeNull();
		expect(parseSpoolCode('https://host/vendor/show/1')).toBeNull();
		expect(parseSpoolCode('hello')).toBeNull();
	});
});
