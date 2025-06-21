import { describe, expect, it, vi } from 'vitest';
import { makeTimestamps } from './timestamps';

type HLC = { tick: () => string };

describe('assignTimestamps', () => {
	it('assigns the same timestamp to all keys in the entity', () => {
		const mockTimestamp = '2024-06-01T12:00:00.000Z';
		const hlc: HLC = { tick: vi.fn(() => mockTimestamp) };
		const data = { id: 'test-entity', a: 1, b: 2, c: 3 };

		const result = makeTimestamps(hlc, data);

		expect(result).toEqual({
			id: mockTimestamp,
			a: mockTimestamp,
			b: mockTimestamp,
			c: mockTimestamp,
		});
		expect(hlc.tick).toHaveBeenCalledTimes(4);
	});

	it('calls hlc.tick for each key', () => {
		const hlc: HLC = { tick: vi.fn(() => 'ts') };
		const data = { id: 'test-entity-2', x: 10, y: 20 };

		makeTimestamps(hlc, data);

		expect(hlc.tick).toHaveBeenCalledTimes(3);
	});

	it('works with different types of values in data', () => {
		const hlc: HLC = { tick: vi.fn(() => 'now') };
		const data = { id: 'test-entity-3', foo: 'bar', num: 42, bool: true };

		const result = makeTimestamps(hlc, data);

		expect(result).toEqual({ id: 'now', foo: 'now', num: 'now', bool: 'now' });
	});
});
