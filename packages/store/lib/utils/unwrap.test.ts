import { describe, expect, test } from 'vitest';
import { unwrap } from './unwrap';

describe('Simple object unwrapping', () => {
	test('should unwrap simple object with CRDT fields', () => {
		const flatDocument = {
			name: {
				_value: 'John',
				_hlc: 'abc',
			},
			age: {
				_value: 30,
				_hlc: 'def',
			},
		};
		const unflattened = unwrap(flatDocument);
		expect(unflattened).toEqual({
			name: 'John',
			age: 30,
		});
	});
});

describe('Nested object unwrapping', () => {
	test('should unwrap nested objects with CRDT fields', () => {
		const nestedDocument = {
			user: {
				name: {
					_value: 'Alice',
					_hlc: 'abc123',
				},
				profile: {
					email: {
						_value: 'alice@example.com',
						_hlc: 'def456',
					},
					settings: {
						theme: {
							_value: 'dark',
							_hlc: 'ghi789',
						},
					},
				},
			},
		};
		const result = unwrap(nestedDocument);
		expect(result).toEqual({
			user: {
				name: 'Alice',
				profile: {
					email: 'alice@example.com',
					settings: {
						theme: 'dark',
					},
				},
			},
		});
	});

	test('should handle mixed CRDT and non-CRDT nested objects', () => {
		const mixedDocument = {
			metadata: {
				created: {
					_value: '2023-01-01',
					_hlc: 'timestamp1',
				},
				tags: ['tag1', 'tag2'], // Non-CRDT array
			},
			content: {
				title: {
					_value: 'Test Document',
					_hlc: 'title1',
				},
			},
		};
		const result = unwrap(mixedDocument);
		expect(result).toEqual({
			metadata: {
				created: '2023-01-01',
				tags: ['tag1', 'tag2'],
			},
			content: {
				title: 'Test Document',
			},
		});
	});
});

describe('Array unwrapping', () => {
	test('should unwrap arrays with CRDT fields', () => {
		const arrayWithCRDT = [
			{
				_value: 'item1',
				_hlc: 'hlc1',
			},
			{
				_value: 'item2',
				_hlc: 'hlc2',
			},
			{
				_value: 42,
				_hlc: 'hlc3',
			},
		];
		const result = unwrap(arrayWithCRDT);
		expect(result).toEqual(['item1', 'item2', 42]);
	});

	test('should handle arrays with mixed CRDT and non-CRDT items', () => {
		const mixedArray = [
			{
				_value: 'crdt-item',
				_hlc: 'hlc1',
			},
			'regular-string',
			123,
			{
				name: {
					_value: 'nested-crdt',
					_hlc: 'hlc2',
				},
				regularField: 'not-crdt',
			},
		];
		const result = unwrap(mixedArray);
		expect(result).toEqual([
			'crdt-item',
			'regular-string',
			123,
			{
				name: 'nested-crdt',
				regularField: 'not-crdt',
			},
		]);
	});

	test('should handle nested arrays', () => {
		const nestedArrays = [
			[
				{
					_value: 'nested-item1',
					_hlc: 'hlc1',
				},
				{
					_value: 'nested-item2',
					_hlc: 'hlc2',
				},
			],
			{
				_value: 'top-level-item',
				_hlc: 'hlc3',
			},
		];
		const result = unwrap(nestedArrays);
		expect(result).toEqual([
			['nested-item1', 'nested-item2'],
			'top-level-item',
		]);
	});
});

describe('Complex mixed structures', () => {
	test('should handle complex nested structures with arrays and objects', () => {
		const complexStructure = {
			users: [
				{
					id: {
						_value: '1',
						_hlc: 'id1',
					},
					profile: {
						name: {
							_value: 'Alice',
							_hlc: 'name1',
						},
						preferences: {
							theme: {
								_value: 'dark',
								_hlc: 'theme1',
							},
							notifications: [
								{
									_value: 'email',
									_hlc: 'notif1',
								},
								{
									_value: 'push',
									_hlc: 'notif2',
								},
							],
						},
					},
				},
			],
			metadata: {
				version: {
					_value: '1.0.0',
					_hlc: 'version1',
				},
				features: ['auth', 'sync'], // Non-CRDT array
			},
		};
		const result = unwrap(complexStructure);
		expect(result).toEqual({
			users: [
				{
					id: '1',
					profile: {
						name: 'Alice',
						preferences: {
							theme: 'dark',
							notifications: ['email', 'push'],
						},
					},
				},
			],
			metadata: {
				version: '1.0.0',
				features: ['auth', 'sync'],
			},
		});
	});

	test('should handle objects with arrays containing mixed structures', () => {
		const mixedArrayObject = {
			items: [
				{
					title: {
						_value: 'First Item',
						_hlc: 'title1',
					},
					tags: ['tag1', 'tag2'], // Non-CRDT
				},
				'simple-string',
				{
					_value: 'crdt-item',
					_hlc: 'item1',
				},
				{
					nested: {
						value: {
							_value: 'deep-value',
							_hlc: 'deep1',
						},
					},
				},
			],
		};
		const result = unwrap(mixedArrayObject);
		expect(result).toEqual({
			items: [
				{
					title: 'First Item',
					tags: ['tag1', 'tag2'],
				},
				'simple-string',
				'crdt-item',
				{
					nested: {
						value: 'deep-value',
					},
				},
			],
		});
	});
});

describe('Edge cases', () => {
	test('should handle null and undefined values', () => {
		expect(unwrap(null)).toBe(null);
		expect(unwrap(undefined)).toBe(undefined);
	});

	test('should handle empty objects and arrays', () => {
		expect(unwrap({})).toEqual({});
		expect(unwrap([])).toEqual([]);
	});

	test('should handle objects with null/undefined CRDT values', () => {
		const nullCRDT = {
			nullValue: {
				_value: null,
				_hlc: 'null1',
			},
			undefinedValue: {
				_value: undefined,
				_hlc: 'undef1',
			},
		};
		const result = unwrap(nullCRDT);
		expect(result).toEqual({
			nullValue: null,
			undefinedValue: undefined,
		});
	});

	test('should handle incomplete CRDT objects (missing _hlc or _value)', () => {
		const incompleteCRDT = {
			missingHlc: {
				_value: 'test',
			},
			missingValue: {
				_hlc: 'hlc1',
			},
			bothMissing: {
				someOtherField: 'value',
			},
		};
		const result = unwrap(incompleteCRDT);
		expect(result).toEqual({
			missingHlc: {
				_value: 'test',
			},
			missingValue: {
				_hlc: 'hlc1',
			},
			bothMissing: {
				someOtherField: 'value',
			},
		});
	});

	test('should handle CRDT fields with complex values', () => {
		const complexValueCRDT = {
			objectValue: {
				_value: { nested: 'object' },
				_hlc: 'obj1',
			},
			arrayValue: {
				_value: [1, 2, 3],
				_hlc: 'arr1',
			},
		};
		const result = unwrap(complexValueCRDT);
		expect(result).toEqual({
			objectValue: { nested: 'object' },
			arrayValue: [1, 2, 3],
		});
	});
});

describe('Primitive values and non-CRDT objects', () => {
	test('should return primitive values unchanged', () => {
		expect(unwrap('string')).toBe('string');
		expect(unwrap(42)).toBe(42);
		expect(unwrap(true)).toBe(true);
		expect(unwrap(false)).toBe(false);
	});

	test('should handle regular objects without CRDT fields', () => {
		const regularObject = {
			name: 'John',
			age: 30,
			active: true,
			hobbies: ['reading', 'coding'],
		};
		const result = unwrap(regularObject);
		expect(result).toEqual(regularObject);
	});

	test('should handle objects with properties that look like CRDT but are not', () => {
		const fakeyCRDT = {
			notCRDT1: {
				_value: 'test',
				_metadata: 'not-hlc',
			},
			notCRDT2: {
				_hlc: 'hlc1',
				_data: 'not-value',
			},
			notCRDT3: {
				_value: 'test',
				_hlc: 'hlc1',
				extraField: 'should-not-be-crdt',
			},
		};
		const result = unwrap(fakeyCRDT);
		expect(result).toEqual({
			notCRDT1: {
				_value: 'test',
				_metadata: 'not-hlc',
			},
			notCRDT2: {
				_hlc: 'hlc1',
				_data: 'not-value',
			},
			notCRDT3: 'test', // This is treated as CRDT because it has both _value and _hlc
		});
	});

	test('should handle Date objects and other built-in objects', () => {
		const date = new Date('2023-01-01');
		const regex = /test/g;
		const objectWithBuiltins = {
			created: date,
			pattern: regex,
			nested: {
				timestamp: date,
			},
		};
		const result = unwrap(objectWithBuiltins);
		// Built-in objects get processed recursively, so they become empty objects
		// since they don't have enumerable properties that are CRDT fields
		expect(result).toEqual({
			created: {},
			pattern: {},
			nested: {
				timestamp: {},
			},
		});
	});
});
