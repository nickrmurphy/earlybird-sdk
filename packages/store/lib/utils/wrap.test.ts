import * as v from 'valibot';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { wrap } from './wrap';

// Test schemas
const userSchema = z.object({
	name: z.string(),
	age: z.number(),
});

const productSchema = v.object({
	title: v.string(),
	price: v.number(),
	inStock: v.boolean(),
});

describe('wrap', () => {
	describe('Simple object wrapping', () => {
		test('should wrap flat object with CRDT fields', () => {
			const document = {
				name: 'John',
				age: 30,
			};

			const result = wrap(document);

			expect(result).toEqual({
				name: {
					_value: 'John',
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
				age: {
					_value: 30,
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
			});
		});

		test('should generate unique HLC values for each field', () => {
			const document = {
				name: 'John',
				age: 30,
				active: true,
			};

			const result = wrap(document);

			const hlcValues = Object.values(result).map((field) => field._hlc);
			const uniqueHlcValues = new Set(hlcValues);

			// Each field should have a unique HLC value
			expect(uniqueHlcValues.size).toBe(hlcValues.length);
		});

		test('should handle various data types', () => {
			const document = {
				stringField: 'test',
				numberField: 42,
				booleanField: true,
				nullField: null,
			};

			const result = wrap(document);

			expect(result.stringField._value).toBe('test');
			expect(result.numberField._value).toBe(42);
			expect(result.booleanField._value).toBe(true);
			expect(result.nullField._value).toBe(null);

			// All should have HLC values
			for (const field of Object.values(result)) {
				expect(field._hlc).toMatch(/^\d+-[a-z0-9]+$/);
			}
		});
	});

	describe('Nested object wrapping', () => {
		test('should wrap nested objects recursively', () => {
			const document = {
				user: {
					name: 'Alice',
					contact: {
						email: 'alice@example.com',
						phone: '123-456-7890',
					},
				},
				active: true,
			};

			const result = wrap(document);

			expect(result).toEqual({
				user: {
					name: {
						_value: 'Alice',
						_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
					},
					contact: {
						email: {
							_value: 'alice@example.com',
							_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
						},
						phone: {
							_value: '123-456-7890',
							_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
						},
					},
				},
				active: {
					_value: true,
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
			});
		});

		test('should handle deeply nested structures', () => {
			const document = {
				level1: {
					level2: {
						level3: {
							level4: {
								value: 'deep',
							},
						},
					},
				},
			};

			const result = wrap(document);

			expect(result).toEqual({
				level1: {
					level2: {
						level3: {
							level4: {
								value: {
									_value: 'deep',
									_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
								},
							},
						},
					},
				},
			});
		});
	});

	describe('Array handling', () => {
		test('should preserve arrays and wrap them as single values', () => {
			const document = {
				items: ['first', 'second', 'third'],
				count: 3,
			};

			const result = wrap(document);

			expect(result).toEqual({
				items: {
					_value: ['first', 'second', 'third'],
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
				count: {
					_value: 3,
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
			});
		});

		test('should preserve arrays of objects without flattening', () => {
			const document = {
				users: [
					{ name: 'John', age: 30 },
					{ name: 'Jane', age: 25 },
				],
			};

			const result = wrap(document);

			expect(result).toEqual({
				users: {
					_value: [
						{ name: 'John', age: 30 },
						{ name: 'Jane', age: 25 },
					],
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
			});
		});

		test('should handle nested objects with arrays', () => {
			const document = {
				user: {
					name: 'Alice',
					hobbies: ['reading', 'coding'],
				},
			};

			const result = wrap(document);

			expect(result).toEqual({
				user: {
					name: {
						_value: 'Alice',
						_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
					},
					hobbies: {
						_value: ['reading', 'coding'],
						_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
					},
				},
			});
		});

		test('should handle empty arrays', () => {
			const document = {
				items: [],
				count: 0,
			};

			const result = wrap(document);

			expect(result).toEqual({
				items: {
					_value: [],
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
				count: {
					_value: 0,
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
			});
		});
	});

	describe('Complex data structures', () => {
		test('should handle mixed nested objects and arrays', () => {
			const document = {
				metadata: {
					created: '2023-01-01',
					updated: '2023-01-02',
					tags: ['important', 'urgent'],
				},
				data: {
					values: [1, 2, 3],
					nested: {
						deep: {
							value: 'test',
						},
					},
				},
			};

			const result = wrap(document);

			expect(result).toEqual({
				metadata: {
					created: {
						_value: '2023-01-01',
						_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
					},
					updated: {
						_value: '2023-01-02',
						_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
					},
					tags: {
						_value: ['important', 'urgent'],
						_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
					},
				},
				data: {
					values: {
						_value: [1, 2, 3],
						_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
					},
					nested: {
						deep: {
							value: {
								_value: 'test',
								_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
							},
						},
					},
				},
			});
		});
	});

	describe('Edge cases', () => {
		test('should handle empty object', () => {
			const document = {};

			const result = wrap(document);

			expect(result).toEqual({});
		});

		test('should handle object with undefined values', () => {
			const document = {
				defined: 'value',
				undefined: undefined,
			};

			const result = wrap(document);

			expect(result).toEqual({
				defined: {
					_value: 'value',
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
				undefined: {
					_value: undefined,
					_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
				},
			});
		});

		test('should handle object with special characters in keys', () => {
			const document = {
				'key-with-dashes': 'value1',
				key_with_underscores: 'value2',
				'key with spaces': 'value3',
			};

			const result = wrap(document);

			expect(result['key-with-dashes']._value).toBe('value1');
			expect(result.key_with_underscores._value).toBe('value2');
			expect(result['key with spaces']._value).toBe('value3');
		});

		test('should handle objects with nested empty objects', () => {
			const document = {
				user: {
					profile: {},
				},
				metadata: {
					tags: [],
				},
			};

			const result = wrap(document);

			expect(result).toEqual({
				user: {
					profile: {},
				},
				metadata: {
					tags: {
						_value: [],
						_hlc: expect.stringMatching(/^\d+-[a-z0-9]+$/),
					},
				},
			});
		});
	});

	describe('Type safety', () => {
		test('should maintain type safety with Zod schema', () => {
			const document: z.infer<typeof userSchema> = {
				name: 'John',
				age: 30,
			};

			const result = wrap(document);

			// TypeScript should infer the correct types
			expect(typeof result.name._value).toBe('string');
			expect(typeof result.age._value).toBe('number');
		});

		test('should maintain type safety with Valibot schema', () => {
			const document: v.InferOutput<typeof productSchema> = {
				title: 'Test Product',
				price: 29.99,
				inStock: true,
			};

			const result = wrap(document);

			expect(typeof result.title._value).toBe('string');
			expect(typeof result.price._value).toBe('number');
			expect(typeof result.inStock._value).toBe('boolean');
		});
	});

	describe('HLC generation', () => {
		test('should generate HLC with timestamp and random component', () => {
			const document = { test: 'value' };

			const result = wrap(document);

			const hlc = result.test._hlc;
			expect(hlc).toMatch(/^\d+-[a-z0-9]+$/);

			const [timestamp, random] = hlc.split('-');
			expect(Number(timestamp)).toBeGreaterThan(0);
			expect(random).toHaveLength(9);
		});

		test('should generate different HLC values for concurrent calls', () => {
			const document1 = { test: 'value1' };
			const document2 = { test: 'value2' };

			const result1 = wrap(document1);
			const result2 = wrap(document2);

			expect(result1.test._hlc).not.toBe(result2.test._hlc);
		});

		test('should generate HLC values that increase over time', () => {
			const document = { test: 'value' };

			const result1 = wrap(document);
			// Small delay to ensure different timestamps
			const start = Date.now();
			while (Date.now() === start) {
				// Wait for next millisecond
			}
			const result2 = wrap(document);

			const [timestamp1] = result1.test._hlc.split('-');
			const [timestamp2] = result2.test._hlc.split('-');

			expect(Number(timestamp2)).toBeGreaterThanOrEqual(Number(timestamp1));
		});
	});

	describe('Error handling', () => {
		test('should throw error for array input', () => {
			const document = ['not', 'an', 'object'];

			// biome-ignore lint/suspicious/noExplicitAny: Suppress to test error handling
			expect(() => wrap(document as any)).toThrow(
				'Invalid object. Wrappable objects must be plain objects.',
			);
		});

		test('should throw error for null input', () => {
			// biome-ignore lint/suspicious/noExplicitAny: Suppress to test error handling
			expect(() => wrap(null as any)).toThrow(
				'Invalid object. Wrappable objects must be plain objects.',
			);
		});

		test('should throw error for primitive input', () => {
			// biome-ignore lint/suspicious/noExplicitAny: Suppress to test error handling
			expect(() => wrap('string' as any)).toThrow(
				'Invalid object. Wrappable objects must be plain objects.',
			);

			// biome-ignore lint/suspicious/noExplicitAny: Suppress to test error handling
			expect(() => wrap(42 as any)).toThrow(
				'Invalid object. Wrappable objects must be plain objects.',
			);

			// biome-ignore lint/suspicious/noExplicitAny: Suppress to test error handling
			expect(() => wrap(true as any)).toThrow(
				'Invalid object. Wrappable objects must be plain objects.',
			);
		});
	});
});
