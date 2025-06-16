/*
 * Original code copyright (c) 2014, Hugh Kennedy
 * Licensed under BSD-3-Clause
 *
 * Modified by Nicholas Murphy for earlybird-sdk
 */

import { describe, expect, test } from 'vitest';
import { flatten, unflatten } from './flatten';

const primitives: Record<string, any> = {
	String: 'good morning',
	Number: 1234.99,
	Boolean: true,
	Date: new Date(),
	null: null,
	undefined,
};

describe('Flatten Primitives', () => {
	Object.keys(primitives).forEach((key) => {
		const value = primitives[key];

		test(key, () => {
			expect(
				flatten({
					hello: {
						world: value,
					},
				}),
			).toEqual({
				'hello.world': value,
			});
		});
	});
});

describe('Unflatten Primitives', () => {
	Object.keys(primitives).forEach((key) => {
		const value = primitives[key];

		test(key, () => {
			expect(
				unflatten({
					'hello.world': value,
				}),
			).toEqual({
				hello: {
					world: value,
				},
			});
		});
	});
});

describe('Flatten', () => {
	test('Nested once', () => {
		expect(
			flatten({
				hello: {
					world: 'good morning',
				},
			}),
		).toEqual({
			'hello.world': 'good morning',
		});
	});

	test('Nested twice', () => {
		expect(
			flatten({
				hello: {
					world: {
						again: 'good morning',
					},
				},
			}),
		).toEqual({
			'hello.world.again': 'good morning',
		});
	});

	test('Multiple Keys', () => {
		expect(
			flatten({
				hello: {
					lorem: {
						ipsum: 'again',
						dolor: 'sit',
					},
				},
				world: {
					lorem: {
						ipsum: 'again',
						dolor: 'sit',
					},
				},
			}),
		).toEqual({
			'hello.lorem.ipsum': 'again',
			'hello.lorem.dolor': 'sit',
			'world.lorem.ipsum': 'again',
			'world.lorem.dolor': 'sit',
		});
	});

	test('Custom Delimiter', () => {
		expect(
			flatten(
				{
					hello: {
						world: {
							again: 'good morning',
						},
					},
				},
				{
					delimiter: ':',
				},
			),
		).toEqual({
			'hello:world:again': 'good morning',
		});
	});

	test('Empty Objects', () => {
		expect(
			flatten({
				hello: {
					empty: {
						nested: {},
					},
				},
			}),
		).toEqual({
			'hello.empty.nested': {},
		});
	});

	if (typeof Buffer !== 'undefined') {
		test('Buffer', () => {
			expect(
				flatten({
					hello: {
						empty: {
							nested: Buffer.from('test'),
						},
					},
				}),
			).toEqual({
				'hello.empty.nested': Buffer.from('test'),
			});
		});
	}

	if (typeof Uint8Array !== 'undefined') {
		test('typed arrays', () => {
			expect(
				flatten({
					hello: {
						empty: {
							nested: new Uint8Array([1, 2, 3, 4]),
						},
					},
				}),
			).toEqual({
				'hello.empty.nested': new Uint8Array([1, 2, 3, 4]),
			});
		});
	}

	test('Custom Depth', () => {
		expect(
			flatten(
				{
					hello: {
						world: {
							again: 'good morning',
						},
					},
					lorem: {
						ipsum: {
							dolor: 'good evening',
						},
					},
				},
				{
					maxDepth: 2,
				},
			),
		).toEqual({
			'hello.world': {
				again: 'good morning',
			},
			'lorem.ipsum': {
				dolor: 'good evening',
			},
		});
	});

	test('Transformed Keys', () => {
		expect(
			flatten(
				{
					hello: {
						world: {
							again: 'good morning',
						},
					},
					lorem: {
						ipsum: {
							dolor: 'good evening',
						},
					},
				},
				{
					transformKey: (key: string) => `__${key}__`,
				},
			),
		).toEqual({
			'__hello__.__world__.__again__': 'good morning',
			'__lorem__.__ipsum__.__dolor__': 'good evening',
		});
	});

	test('Should keep number in the left when object', () => {
		expect(
			flatten({
				hello: {
					'0200': 'world',
					'0500': 'darkness my old friend',
				},
			}),
		).toEqual({
			'hello.0200': 'world',
			'hello.0500': 'darkness my old friend',
		});
	});
});

describe('Unflatten', () => {
	test('Nested once', () => {
		expect(
			unflatten({
				'hello.world': 'good morning',
			}),
		).toEqual({
			hello: {
				world: 'good morning',
			},
		});
	});

	test('Nested twice', () => {
		expect(
			unflatten({
				'hello.world.again': 'good morning',
			}),
		).toEqual({
			hello: {
				world: {
					again: 'good morning',
				},
			},
		});
	});

	test('Multiple Keys', () => {
		expect(
			unflatten({
				'hello.lorem.ipsum': 'again',
				'hello.lorem.dolor': 'sit',
				'world.lorem.ipsum': 'again',
				'world.lorem.dolor': 'sit',
				world: { greet: 'hello' },
			}),
		).toEqual({
			hello: {
				lorem: {
					ipsum: 'again',
					dolor: 'sit',
				},
			},
			world: {
				greet: 'hello',
				lorem: {
					ipsum: 'again',
					dolor: 'sit',
				},
			},
		});
	});

	test('nested objects do not clobber each other when a.b inserted before a', () => {
		const x: Record<string, any> = {};
		x['foo.bar'] = { t: 123 };
		x.foo = { p: 333 };
		expect(unflatten(x)).toEqual({
			foo: {
				bar: {
					t: 123,
				},
				p: 333,
			},
		});
	});

	test('Custom Delimiter', () => {
		expect(
			unflatten(
				{
					'hello world again': 'good morning',
				},
				{
					delimiter: ' ',
				},
			),
		).toEqual({
			hello: {
				world: {
					again: 'good morning',
				},
			},
		});
	});

	test('Overwrite', () => {
		expect(
			unflatten(
				{
					travis: 'true',
					travis_build_dir: '/home/travis/build/kvz/environmental',
				},
				{
					delimiter: '_',
					overwrite: true,
				},
			),
		).toEqual({
			travis: {
				build: {
					dir: '/home/travis/build/kvz/environmental',
				},
			},
		});
	});

	test('Transformed Keys', () => {
		expect(
			unflatten(
				{
					'__hello__.__world__.__again__': 'good morning',
					'__lorem__.__ipsum__.__dolor__': 'good evening',
				},
				{
					transformKey: (key: string) => key.substring(2, key.length - 2),
				},
			),
		).toEqual({
			hello: {
				world: {
					again: 'good morning',
				},
			},
			lorem: {
				ipsum: {
					dolor: 'good evening',
				},
			},
		});
	});

	test('Messy', () => {
		expect(
			unflatten({
				'hello.world': 'again',
				'lorem.ipsum': 'another',
				'good.morning': {
					'hash.key': {
						'nested.deep': {
							'and.even.deeper.still': 'hello',
						},
					},
				},
				'good.morning.again': {
					'testing.this': 'out',
				},
			}),
		).toEqual({
			hello: { world: 'again' },
			lorem: { ipsum: 'another' },
			good: {
				morning: {
					hash: {
						key: {
							nested: {
								deep: {
									and: {
										even: {
											deeper: { still: 'hello' },
										},
									},
								},
							},
						},
					},
					again: { testing: { this: 'out' } },
				},
			},
		});
	});

	describe('Overwrite + non-object values in key positions', () => {
		test('non-object keys + overwrite should be overwritten', () => {
			expect(unflatten({ a: null, 'a.b': 'c' }, { overwrite: true })).toEqual({
				a: { b: 'c' },
			});
			expect(unflatten({ a: 0, 'a.b': 'c' }, { overwrite: true })).toEqual({
				a: { b: 'c' },
			});
			expect(unflatten({ a: 1, 'a.b': 'c' }, { overwrite: true })).toEqual({
				a: { b: 'c' },
			});
			expect(unflatten({ a: '', 'a.b': 'c' }, { overwrite: true })).toEqual({
				a: { b: 'c' },
			});
		});

		test('overwrite value should not affect undefined keys', () => {
			expect(
				unflatten({ a: undefined, 'a.b': 'c' }, { overwrite: true }),
			).toEqual({ a: { b: 'c' } });
			expect(
				unflatten({ a: undefined, 'a.b': 'c' }, { overwrite: false }),
			).toEqual({ a: { b: 'c' } });
		});

		test('if no overwrite, should ignore nested values under non-object key', () => {
			expect(unflatten({ a: null, 'a.b': 'c' })).toEqual({ a: null });
			expect(unflatten({ a: 0, 'a.b': 'c' })).toEqual({ a: 0 });
			expect(unflatten({ a: 1, 'a.b': 'c' })).toEqual({ a: 1 });
			expect(unflatten({ a: '', 'a.b': 'c' })).toEqual({ a: '' });
		});
	});

	describe('.safe', () => {
		test('Should protect arrays when true', () => {
			expect(
				flatten(
					{
						hello: [{ world: { again: 'foo' } }, { lorem: 'ipsum' }],
						another: {
							nested: [{ array: { too: 'deep' } }],
						},
						lorem: {
							ipsum: 'whoop',
						},
					},
					{
						safe: true,
					},
				),
			).toEqual({
				hello: [{ world: { again: 'foo' } }, { lorem: 'ipsum' }],
				'lorem.ipsum': 'whoop',
				'another.nested': [{ array: { too: 'deep' } }],
			});
		});

		test('Should not protect arrays when false', () => {
			expect(
				flatten(
					{
						hello: [{ world: { again: 'foo' } }, { lorem: 'ipsum' }],
					},
					{
						safe: false,
					},
				),
			).toEqual({
				'hello.0.world.again': 'foo',
				'hello.1.lorem': 'ipsum',
			});
		});

		test('Empty objects should not be removed', () => {
			expect(
				unflatten({
					foo: [],
					bar: {},
				}),
			).toEqual({ foo: [], bar: {} });
		});
	});

	describe('.object', () => {
		test('Should create object instead of array when true', () => {
			const unflattened = unflatten(
				{
					'hello.you.0': 'ipsum',
					'hello.you.1': 'lorem',
					'hello.other.world': 'foo',
				},
				{
					object: true,
				},
			);
			expect(unflattened).toEqual({
				hello: {
					you: {
						0: 'ipsum',
						1: 'lorem',
					},
					other: { world: 'foo' },
				},
			});
			expect(Array.isArray(unflattened.hello.you)).toBe(false);
		});

		test('Should create object instead of array when nested', () => {
			const unflattened = unflatten(
				{
					hello: {
						'you.0': 'ipsum',
						'you.1': 'lorem',
						'other.world': 'foo',
					},
				},
				{
					object: true,
				},
			);
			expect(unflattened).toEqual({
				hello: {
					you: {
						0: 'ipsum',
						1: 'lorem',
					},
					other: { world: 'foo' },
				},
			});
			expect(Array.isArray(unflattened.hello.you)).toBe(false);
		});

		test('Should keep the zero in the left when object is true', () => {
			const unflattened = unflatten(
				{
					'hello.0200': 'world',
					'hello.0500': 'darkness my old friend',
				},
				{
					object: true,
				},
			);

			expect(unflattened).toEqual({
				hello: {
					'0200': 'world',
					'0500': 'darkness my old friend',
				},
			});
		});

		test('Should not create object when false', () => {
			const unflattened = unflatten(
				{
					'hello.you.0': 'ipsum',
					'hello.you.1': 'lorem',
					'hello.other.world': 'foo',
				},
				{
					object: false,
				},
			);
			expect(unflattened).toEqual({
				hello: {
					you: ['ipsum', 'lorem'],
					other: { world: 'foo' },
				},
			});
			expect(Array.isArray(unflattened.hello.you)).toBe(true);
		});
	});

	if (typeof Buffer !== 'undefined') {
		test('Buffer', () => {
			expect(
				unflatten({
					'hello.empty.nested': Buffer.from('test'),
				}),
			).toEqual({
				hello: {
					empty: {
						nested: Buffer.from('test'),
					},
				},
			});
		});
	}

	if (typeof Uint8Array !== 'undefined') {
		test('typed arrays', () => {
			expect(
				unflatten({
					'hello.empty.nested': new Uint8Array([1, 2, 3, 4]),
				}),
			).toEqual({
				hello: {
					empty: {
						nested: new Uint8Array([1, 2, 3, 4]),
					},
				},
			});
		});
	}

	test('should not pollute prototype', () => {
		unflatten({
			'__proto__.polluted': true,
		});
		unflatten({
			'prefix.__proto__.polluted': true,
		});
		unflatten({
			'prefix.0.__proto__.polluted': true,
		});

		expect(({} as { polluted: boolean }).polluted).not.toBe(true);
	});
});

describe('Arrays', () => {
	test('Should be able to flatten arrays properly', () => {
		expect(
			flatten({
				a: ['foo', 'bar'],
			}),
		).toEqual({
			'a.0': 'foo',
			'a.1': 'bar',
		});
	});

	test('Should be able to revert and reverse array serialization via unflatten', () => {
		expect(
			unflatten({
				'a.0': 'foo',
				'a.1': 'bar',
			}),
		).toEqual({
			a: ['foo', 'bar'],
		});
	});

	test('Array typed objects should be restored by unflatten', () => {
		expect(
			Object.prototype.toString.call(
				unflatten({
					'a.0': 'foo',
					'a.1': 'bar',
				}).a,
			),
		).toBe(Object.prototype.toString.call(['foo', 'bar']));
	});

	test('Do not include keys with numbers inside them', () => {
		expect(
			unflatten({
				'1key.2_key': 'ok',
			}),
		).toEqual({
			'1key': {
				'2_key': 'ok',
			},
		});
	});
});

describe('Order of Keys', () => {
	test('Order of keys should not be changed after round trip flatten/unflatten', () => {
		const obj = {
			b: 1,
			abc: {
				c: [
					{
						d: 1,
						bca: 1,
						a: 1,
					},
				],
			},
			a: 1,
		};
		const result = unflatten(flatten(obj));

		expect(Object.keys(result)).toEqual(Object.keys(obj));
		expect(Object.keys(result.abc)).toEqual(Object.keys(obj.abc));
		expect(Object.keys(result.abc.c[0])).toEqual(Object.keys(obj.abc.c[0]));
	});
});

describe('Flatten transformValue', () => {
	test('should transform primitive values', () => {
		const data = {
			user: {
				name: 'John',
				age: 30,
			},
		};

		const result = flatten(data, {
			transformValue: (value) => {
				if (typeof value === 'string') {
					return value.toUpperCase();
				}
				if (typeof value === 'number') {
					return value * 2;
				}
				return value;
			},
		});

		expect(result).toEqual({
			'user.name': 'JOHN',
			'user.age': 60,
		});
	});

	test('should provide key context to transformValue', () => {
		const data = {
			user: {
				id: 123,
				profile: {
					email: 'test@example.com',
				},
			},
		};

		const result = flatten(data, {
			transformValue: (value, key) => {
				if (key.includes('email')) {
					return value.toLowerCase();
				}
				if (key.includes('id')) {
					return `ID:${value}`;
				}
				return value;
			},
		});

		expect(result).toEqual({
			'user.id': 'ID:123',
			'user.profile.email': 'test@example.com',
		});
	});

	test('should work with Date objects', () => {
		const testDate = new Date('2023-01-01T10:00:00.000Z');
		const data = {
			created: testDate,
			updated: testDate,
		};

		const result = flatten(data, {
			transformValue: (value) => {
				if (value instanceof Date) {
					return value.toISOString();
				}
				return value;
			},
		});

		expect(result).toEqual({
			created: '2023-01-01T10:00:00.000Z',
			updated: '2023-01-01T10:00:00.000Z',
		});
	});

	test('should not transform when transformValue not provided', () => {
		const data = {
			user: {
				name: 'John',
				age: 30,
			},
		};

		const result = flatten(data);

		expect(result).toEqual({
			'user.name': 'John',
			'user.age': 30,
		});
	});

	test('should work with arrays', () => {
		const data = {
			users: [
				{ name: 'John', age: 30 },
				{ name: 'Jane', age: 25 },
			],
		};

		const result = flatten(data, {
			transformValue: (value) => {
				if (typeof value === 'string') {
					return value.toUpperCase();
				}
				return value;
			},
		});

		expect(result).toEqual({
			'users.0.name': 'JOHN',
			'users.0.age': 30,
			'users.1.name': 'JANE',
			'users.1.age': 25,
		});
	});

	test('should work with combined transformKey and transformValue', () => {
		const data = {
			userName: 'john',
			userAge: 30,
		};

		const result = flatten(data, {
			transformKey: (key) => key.toLowerCase(),
			transformValue: (value) => {
				if (typeof value === 'string') {
					return value.toUpperCase();
				}
				return value;
			},
		});

		expect(result).toEqual({
			username: 'JOHN',
			userage: 30,
		});
	});

	test('should handle null and undefined values', () => {
		const data = {
			nullValue: null,
			undefinedValue: undefined,
			emptyString: '',
		};

		const result = flatten(data, {
			transformValue: (value, key) => {
				if (value === null) return 'NULL';
				if (value === undefined) return 'UNDEFINED';
				if (value === '') return 'EMPTY';
				return value;
			},
		});

		expect(result).toEqual({
			nullValue: 'NULL',
			undefinedValue: 'UNDEFINED',
			emptyString: 'EMPTY',
		});
	});
});

describe('Unflatten transformValue', () => {
	test('should transform primitive values during unflatten', () => {
		const flatData = {
			'user.name': 'john',
			'user.age': 30,
		};

		const result = unflatten(flatData, {
			transformValue: (value) => {
				if (typeof value === 'string') {
					return value.toUpperCase();
				}
				if (typeof value === 'number') {
					return value * 2;
				}
				return value;
			},
		});

		expect(result).toEqual({
			user: {
				name: 'JOHN',
				age: 60,
			},
		});
	});

	test('should provide key context to transformValue during unflatten', () => {
		const flatData = {
			'user.id': 123,
			'user.profile.email': 'TEST@EXAMPLE.COM',
		};

		const result = unflatten(flatData, {
			transformValue: (value, key) => {
				if (key.includes('email')) {
					return value.toLowerCase();
				}
				if (key.includes('id')) {
					return `ID:${value}`;
				}
				return value;
			},
		});

		expect(result).toEqual({
			user: {
				id: 'ID:123',
				profile: {
					email: 'test@example.com',
				},
			},
		});
	});

	test('should work with Date string to Date object transformation', () => {
		const flatData = {
			created: '2023-01-01T10:00:00.000Z',
			updated: '2023-01-01T10:00:00.000Z',
		};

		const result = unflatten(flatData, {
			transformValue: (value) => {
				if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
					return new Date(value);
				}
				return value;
			},
		});

		expect(result).toEqual({
			created: new Date('2023-01-01T10:00:00.000Z'),
			updated: new Date('2023-01-01T10:00:00.000Z'),
		});
	});

	test('should not transform when transformValue not provided', () => {
		const flatData = {
			'user.name': 'John',
			'user.age': 30,
		};

		const result = unflatten(flatData);

		expect(result).toEqual({
			user: {
				name: 'John',
				age: 30,
			},
		});
	});

	test('should work with arrays during unflatten', () => {
		const flatData = {
			'users.0.name': 'john',
			'users.0.age': 30,
			'users.1.name': 'jane',
			'users.1.age': 25,
		};

		const result = unflatten(flatData, {
			transformValue: (value) => {
				if (typeof value === 'string') {
					return value.toUpperCase();
				}
				return value;
			},
		});

		expect(result).toEqual({
			users: [
				{ name: 'JOHN', age: 30 },
				{ name: 'JANE', age: 25 },
			],
		});
	});
});

describe('Round-trip and Integration Tests', () => {
	test('should handle round-trip Date serialization', () => {
		const originalData = {
			user: {
				createdAt: new Date('2023-01-01T10:00:00.000Z'),
				profile: {
					lastLogin: new Date('2023-01-02T15:30:00.000Z'),
				},
			},
		};

		// Flatten with Date to ISO string transformation
		const flattened = flatten(originalData, {
			transformValue: (value) => {
				if (value instanceof Date) {
					return value.toISOString();
				}
				return value;
			},
		});

		expect(flattened).toEqual({
			'user.createdAt': '2023-01-01T10:00:00.000Z',
			'user.profile.lastLogin': '2023-01-02T15:30:00.000Z',
		});

		// Unflatten with ISO string to Date transformation
		const restored = unflatten(flattened, {
			transformValue: (value) => {
				if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
					return new Date(value);
				}
				return value;
			},
		});

		expect(restored).toEqual(originalData);
	});

	test('should work with combined transformKey and transformValue', () => {
		const data = {
			UserName: 'john_doe',
			UserAge: 30,
			UserProfile: {
				EmailAddress: 'JOHN@EXAMPLE.COM',
			},
		};

		const flattened = flatten(data, {
			transformKey: (key) =>
				key
					.replace(/([A-Z])/g, (match, letter) => '_' + letter.toLowerCase())
					.toLowerCase(),
			transformValue: (value) => {
				if (typeof value === 'string' && value.includes('@')) {
					return value.toLowerCase();
				}
				return value;
			},
		});

		expect(flattened).toEqual({
			_user_name: 'john_doe',
			_user_age: 30,
			'_user_profile._email_address': 'john@example.com',
		});

		const restored = unflatten(flattened, {
			transformKey: (key) =>
				key
					.replace(/^_/, '')
					.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
			transformValue: (value) => {
				if (typeof value === 'string' && value.includes('@')) {
					return value.toUpperCase();
				}
				return value;
			},
		});

		expect(restored).toEqual({
			userName: 'john_doe',
			userAge: 30,
			userProfile: {
				emailAddress: 'JOHN@EXAMPLE.COM',
			},
		});
	});

	test('should work with custom delimiter and transformValue', () => {
		const data = {
			user: {
				settings: {
					theme: 'dark',
					language: 'en',
				},
			},
		};

		const flattened = flatten(data, {
			delimiter: '->',
			transformValue: (value) => {
				if (typeof value === 'string') {
					return value.toUpperCase();
				}
				return value;
			},
		});

		expect(flattened).toEqual({
			'user->settings->theme': 'DARK',
			'user->settings->language': 'EN',
		});

		const restored = unflatten(flattened, {
			delimiter: '->',
			transformValue: (value) => {
				if (typeof value === 'string') {
					return value.toLowerCase();
				}
				return value;
			},
		});

		expect(restored).toEqual({
			user: {
				settings: {
					theme: 'dark',
					language: 'en',
				},
			},
		});
	});

	test('should handle maxDepth with transformValue', () => {
		const data = {
			level1: {
				level2: {
					level3: {
						value: 'deep',
					},
				},
			},
		};

		const flattened = flatten(data, {
			maxDepth: 2,
			transformValue: (value) => {
				if (typeof value === 'string') {
					return value.toUpperCase();
				}
				// For objects, we don't transform them
				return value;
			},
		});

		expect(flattened).toEqual({
			'level1.level2': {
				level3: {
					value: 'deep',
				},
			},
		});
	});

	test('should handle error cases gracefully', () => {
		const data = {
			valid: 'test',
			invalid: null,
		};

		// Test transformValue that might throw
		const result = flatten(data, {
			transformValue: (value, key) => {
				if (key === 'invalid' && value === null) {
					return 'NULL$value';
				}
				if (typeof value === 'string') {
					return value.toUpperCase();
				}
				return value;
			},
		});

		expect(result).toEqual({
			valid: 'TEST',
			invalid: 'NULL$value',
		});
	});

	test('should maintain object references properly with arrays', () => {
		const data = {
			items: [
				{ id: 1, name: 'first' },
				{ id: 2, name: 'second' },
			],
		};

		const flattened = flatten(data, {
			transformValue: (value, key) => {
				if (typeof value === 'string' && key.includes('name')) {
					return value.toUpperCase();
				}
				return value;
			},
		});

		expect(flattened).toEqual({
			'items.0.id': 1,
			'items.0.name': 'FIRST',
			'items.1.id': 2,
			'items.1.name': 'SECOND',
		});

		const restored = unflatten(flattened, {
			transformValue: (value, key) => {
				if (typeof value === 'string' && key.includes('name')) {
					return value.toLowerCase();
				}
				return value;
			},
		});

		expect(restored).toEqual({
			items: [
				{ id: 1, name: 'first' },
				{ id: 2, name: 'second' },
			],
		});
	});
});
