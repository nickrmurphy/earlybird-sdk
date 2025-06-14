import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceHLC, createClock, generateHLC } from './hlc';

describe('hlc', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('generateHLC', () => {
		it('should create HLC string with correct format', () => {
			vi.setSystemTime(new Date('2023-01-01T12:34:56.789Z'));
			const hlc = generateHLC();

			expect(hlc).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-\d{6}-[a-z0-9]{6}$/,
			);
			expect(hlc).toContain('2023-01-01T12:34:56.789Z-000000-');
		});

		it('should generate unique nonces for different HLC instances', () => {
			const hlc1 = generateHLC();
			const hlc2 = generateHLC();

			const nonce1 = hlc1.split('-').slice(-1)[0];
			const nonce2 = hlc2.split('-').slice(-1)[0];
			expect(nonce1).not.toBe(nonce2);
		});

		it('should use current timestamp as default physical time', () => {
			vi.setSystemTime(new Date('2023-05-15T10:30:45.123Z'));
			const hlc = generateHLC();

			expect(hlc).toContain('2023-05-15T10:30:45.123Z-000000-');
		});
	});

	describe('advanceHLC', () => {
		it('should advance physical time and reset logical counter when time moves forward', () => {
			vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
			const hlc = '2023-01-01T00:00:00.000Z-000005-test01';

			vi.setSystemTime(new Date('2023-01-01T00:00:02.000Z')); // 2 seconds later
			const result = advanceHLC(hlc);

			expect(result).toContain('2023-01-01T00:00:02.000Z-000000-');
			expect(result).not.toContain('test01');
			expect(result.split('-')[3]).toBe('000000'); // logical reset to 0
		});

		it('should increment logical counter when physical time is the same', () => {
			vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
			const hlc = '2023-01-01T00:00:00.000Z-000003-test01';

			const result = advanceHLC(hlc);

			expect(result).toContain('2023-01-01T00:00:00.000Z-000004-');
			expect(result).not.toContain('test01');
			expect(result.split('-')[3]).toBe('000004'); // logical incremented to 4
		});

		it('should handle time going backwards (clock adjustment)', () => {
			vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z')); // past time
			const hlc = '2023-01-01T00:01:00.000Z-000002-test01'; // future time

			const result = advanceHLC(hlc);

			expect(result).toContain('2023-01-01T00:01:00.000Z-000003-');
			expect(result).not.toContain('test01');
			expect(result.split('-')[3]).toBe('000003'); // logical incremented from 2
		});

		it('should generate new nonce on each call', () => {
			vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
			const hlc = '2023-01-01T00:00:00.000Z-000000-test01';

			const result1 = advanceHLC(hlc);
			const result2 = advanceHLC(hlc);

			const nonce1 = result1.split('-').slice(-1)[0];
			const nonce2 = result2.split('-').slice(-1)[0];

			expect(nonce1).not.toBe(nonce2);
			expect(nonce1).toMatch(/^[a-z0-9]{6}$/);
			expect(nonce2).toMatch(/^[a-z0-9]{6}$/);
		});
	});

	describe('string comparison', () => {
		it('should compare HLC strings correctly', () => {
			const hlc1 = '2023-01-01T00:00:00.000Z-000001-abc123';
			const hlc2 = '2023-01-01T00:00:00.000Z-000002-def456';
			const hlc3 = '2023-01-01T00:00:01.000Z-000001-ghi789';

			expect(hlc1 < hlc2).toBe(true); // same time, logical 1 < 2
			expect(hlc2 > hlc1).toBe(true);
			expect(hlc1 < hlc3).toBe(true); // different time
			expect(hlc3 > hlc1).toBe(true);
			// biome-ignore lint/suspicious/noSelfCompare: Assert for testing
			expect(hlc1 === hlc1).toBe(true);
		});

		it('should handle nonce comparison for tie-breaking', () => {
			const hlc1 = '2023-01-01T00:00:00.000Z-000001-abc123';
			const hlc2 = '2023-01-01T00:00:00.000Z-000001-def456';

			expect(hlc1 < hlc2).toBe(true); // same time and logical, nonce "abc123" < "def456"
		});
	});

	describe('edge cases', () => {
		it('should handle large logical counter values', () => {
			vi.setSystemTime(new Date('2023-01-01T00:00:00.000Z'));
			const hlc = '2023-01-01T00:00:00.000Z-999998-test01';

			const result = advanceHLC(hlc);

			expect(result.split('-')[3]).toBe('999999');
		});

		it('should handle zero timestamps', () => {
			vi.setSystemTime(new Date(0));
			const hlc = generateHLC();

			const result = advanceHLC(hlc);

			expect(result).toContain('1970-01-01T00:00:00.000Z-000001-');
		});
	});

	describe('createClock', () => {
		it('should set seed timestamp', () => {
			const seed = '2023-01-01T00:00:00.000Z-000000-abcdef';
			const clock = createClock(seed);

			expect(clock.current()).toEqual(seed);
		});

		it('should advance clock', () => {
			vi.setSystemTime(new Date('2023-01-01T00:00:01.000Z'));

			const seed = '2023-01-01T00:00:00.000Z-000000-abcdef';
			const clock = createClock(seed);

			const newHLC = clock.tick();
			expect(newHLC > seed).toBeTruthy();

			expect(clock.current()).not.toEqual(seed);
			expect(clock.current() > seed).toBeTruthy();
		});
	});
});
