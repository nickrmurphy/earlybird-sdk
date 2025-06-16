import { describe, expect, test } from 'vitest';
import { createClock } from './hlc';
import { deserializeFromCRDT, serializeToCRDT } from './serialize';

describe('serializeToCRDT', () => {
	test('serializes object to CRDT', () => {
		const clock = createClock();
		const data = { name: 'test' };
		const result = serializeToCRDT(data, clock);

		expect(result._value.name._value).toBe('test');
		expect(result._value.name._hlc).toBeDefined();
	});

	test('throws on invalid data', () => {
		const clock = createClock();
		expect(() => serializeToCRDT('string', clock)).toThrow('Invalid data type');
	});
});

describe('deserializeFromCRDT', () => {
	test('deserializes CRDT to object', () => {
		const clock = createClock();
		const data = { name: 'test' };
		const serialized = serializeToCRDT(data, clock);
		const result = deserializeFromCRDT(serialized);
		expect(result).toEqual(data);
	});

	test('handles nested objects', () => {
		const clock = createClock();
		const data = { user: { name: 'test', age: 25 } };
		const serialized = serializeToCRDT(data, clock);
		const result = deserializeFromCRDT(serialized);
		expect(result).toEqual(data);
	});

	test('handles objects with arrays', () => {
		const clock = createClock();
		const data = { tags: ['one', 'two'], count: 2 };
		const serialized = serializeToCRDT(data, clock);
		const result = deserializeFromCRDT(serialized);
		expect(result).toEqual(data);
	});
});
