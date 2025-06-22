import { describe, expect, it } from 'vitest';
import {
	createFixedNonceProvider,
	createMockTimeProvider,
} from '../../testing/providers';
import { advanceHLC, generateHLC } from './functions';

describe('HLC functions', () => {
	describe('generateHLC', () => {
		it('should create HLC string with correct format', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T12:34:56.789Z'),
			);
			const nonceProvider = createFixedNonceProvider('abc123');

			const hlc = generateHLC(timeProvider, nonceProvider);

			expect(hlc).toMatch(
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-\d{6}-[a-z0-9]{6}$/,
			);
			expect(hlc).toBe('2023-01-01T12:34:56.789Z-000000-abc123');
		});

		it('should generate unique nonces for different HLC instances', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			);

			const hlc1 = generateHLC(timeProvider);
			const hlc2 = generateHLC(timeProvider);

			const nonce1 = hlc1.split('-').slice(-1)[0];
			const nonce2 = hlc2.split('-').slice(-1)[0];
			expect(nonce1).not.toBe(nonce2);
		});

		it('should use current timestamp as default physical time', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2024-01-01T00:00:00.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('def456');

			const hlc = generateHLC(timeProvider, nonceProvider);

			expect(hlc).toBe('2024-01-01T00:00:00.000Z-000000-def456');
		});
	});

	describe('advanceHLC', () => {
		it('should advance physical time and reset logical counter when time moves forward', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:02.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('new123');
			const hlc = '2023-01-01T00:00:00.000Z-000005-test01';

			const result = advanceHLC(hlc, timeProvider, nonceProvider);

			expect(result).toBe('2023-01-01T00:00:02.000Z-000000-new123');
			expect(result.split('-')[3]).toBe('000000'); // logical reset to 0
		});

		it('should increment logical counter when physical time is the same', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('new456');
			const hlc = '2023-01-01T00:00:00.000Z-000003-test01';

			const result = advanceHLC(hlc, timeProvider, nonceProvider);

			expect(result).toBe('2023-01-01T00:00:00.000Z-000004-new456');
			expect(result.split('-')[3]).toBe('000004'); // logical incremented to 4
		});

		it('should handle time going backwards (clock adjustment)', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			); // past time
			const nonceProvider = createFixedNonceProvider('new789');
			const hlc = '2023-01-01T00:01:00.000Z-000002-test01'; // future time

			const result = advanceHLC(hlc, timeProvider, nonceProvider);

			expect(result).toBe('2023-01-01T00:01:00.000Z-000003-new789');
			expect(result.split('-')[3]).toBe('000003'); // logical incremented from 2
		});

		it('should generate new nonce on each call', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			);
			const hlc = '2023-01-01T00:00:00.000Z-000000-test01';

			const result1 = advanceHLC(hlc, timeProvider);
			const result2 = advanceHLC(hlc, timeProvider);

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
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('large1');
			const hlc = '2023-01-01T00:00:00.000Z-999998-test01';

			const result = advanceHLC(hlc, timeProvider, nonceProvider);

			expect(result).toBe('2023-01-01T00:00:00.000Z-999999-large1');
			expect(result.split('-')[3]).toBe('999999');
		});

		it('should handle zero timestamps', () => {
			const timeProvider = createMockTimeProvider(new Date(0));
			const nonceProvider = createFixedNonceProvider('zero01');
			const hlc = generateHLC(timeProvider, nonceProvider);

			const result = advanceHLC(hlc, timeProvider, nonceProvider);

			expect(result).toBe('1970-01-01T00:00:00.000Z-000001-zero01');
		});
	});
});
