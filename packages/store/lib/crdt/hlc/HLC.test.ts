import { describe, expect, it } from 'vitest';
import {
	createFixedNonceProvider,
	createMockTimeProvider,
} from '../../testing/providers';
import { HLC } from './HLC';

describe('HLC', () => {
	describe('HLC with defaults', () => {
		it('should set seed timestamp', () => {
			const seed = '2023-01-01T00:00:00.000Z-000000-abcdef';
			const clock = new HLC(undefined, undefined, seed);

			expect(clock.current()).toEqual(seed);
		});

		it('should advance clock', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:01.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('tick01');

			const seed = '2023-01-01T00:00:00.000Z-000000-abcdef';
			const clock = new HLC(timeProvider, nonceProvider, seed);

			const newHLC = clock.tick();
			expect(newHLC).toBe('2023-01-01T00:00:01.000Z-000000-tick01');

			expect(clock.current()).toBe('2023-01-01T00:00:01.000Z-000000-tick01');
			expect(clock.current() > seed).toBeTruthy();
		});
	});

	describe('HLC class', () => {
		it('should initialize with provided seed', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('test01');
			const seed = '2023-01-01T00:00:00.000Z-000000-abcdef';

			const clock = new HLC(timeProvider, nonceProvider, seed);

			expect(clock.current()).toBe(seed);
		});

		it('should generate initial HLC when no seed provided', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('init01');

			const clock = new HLC(timeProvider, nonceProvider);

			expect(clock.current()).toBe('2023-01-01T00:00:00.000Z-000000-init01');
		});

		it('should advance on tick', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:01.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('tick01');
			const seed = '2023-01-01T00:00:00.000Z-000000-abcdef';

			const clock = new HLC(timeProvider, nonceProvider, seed);
			const newHLC = clock.tick();

			expect(newHLC).toBe('2023-01-01T00:00:01.000Z-000000-tick01');
			expect(clock.current()).toBe(newHLC);
		});

		it('should advance timestamp when advanceTo() is called with newer timestamp', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('test01');
			const seed = '2023-01-01T00:00:00.000Z-000000-abcdef';

			const clock = new HLC(timeProvider, nonceProvider, seed);
			const olderTimestamp = '2022-12-31T00:00:00.000Z-000000-older1';

			clock.advanceTo(olderTimestamp);

			expect(clock.current()).toBe(olderTimestamp);
		});

		it('should not change when advanceTo() is called with same timestamp', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('test01');
			const seed = '2023-01-01T00:00:00.000Z-000000-abcdef';

			const clock = new HLC(timeProvider, nonceProvider, seed);
			const original = clock.current();

			clock.advanceTo(seed);

			expect(clock.current()).toBe(original);
		});

		it('should not advance when advanceTo() is called with newer timestamp', () => {
			const timeProvider = createMockTimeProvider(
				new Date('2023-01-01T00:00:00.000Z'),
			);
			const nonceProvider = createFixedNonceProvider('test01');
			const seed = '2023-01-01T00:00:00.000Z-000000-abcdef';

			const clock = new HLC(timeProvider, nonceProvider, seed);
			const original = clock.current();
			const newerTimestamp = '2023-01-02T00:00:00.000Z-000000-newer1';

			clock.advanceTo(newerTimestamp);

			expect(clock.current()).toBe(original);
		});
	});
});
