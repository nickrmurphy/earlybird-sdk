import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import type { HLC } from './hlc';
import { mergeDocuments, mergeFields } from './merge';

const stringSchema = z.string();
const objectSchema = z.object({
	a: stringSchema,
	b: stringSchema,
});

describe('mergeFields', () => {
	test('returns field with higher HLC', () => {
		const fieldA = {
			_value: 'old',
			_hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC,
		};
		const fieldB = {
			_value: 'new',
			_hlc: '2023-01-01T00:00:01.000Z-000000-def456' as HLC,
		};
		const result = mergeFields<typeof stringSchema>(fieldA, fieldB);
		expect(result).toBe(fieldB);
	});
});

describe('mergeDocuments', () => {
	test('merges documents with no conflicts', () => {
		const docA = {
			_hash: 'hashA',
			_value: {
				a: {
					_value: 'valueA',
					_hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC,
				},
			},
		};
		const docB = {
			_hash: 'hashB',
			_value: {
				b: {
					_value: 'valueB',
					_hlc: '2023-01-01T00:00:00.000Z-000000-def456' as HLC,
				},
			},
		};
		const result = mergeDocuments<typeof objectSchema>(docA, docB);
		expect(result._value.a._value).toBe('valueA');
		expect(result._value.b._value).toBe('valueB');
	});

	test('resolves conflicts using HLC', () => {
		const docA = {
			_hash: 'hashA',
			_value: {
				key: {
					_value: 'old',
					_hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC,
				},
			},
		};
		const docB = {
			_hash: 'hashB',
			_value: {
				key: {
					_value: 'new',
					_hlc: '2023-01-01T00:00:01.000Z-000000-def456' as HLC,
				},
			},
		};
		const keyObjectSchema = z.object({
			key: stringSchema,
		});
		const result = mergeDocuments<typeof keyObjectSchema>(docA, docB);
		expect(result._value.key._value).toBe('new');
	});

	test('generates new hash for merged document', () => {
		const docA = {
			_hash: 'hashA',
			_value: {
				a: {
					_value: 'valueA',
					_hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC,
				},
			},
		};
		const docB = {
			_hash: 'hashB',
			_value: {
				b: {
					_value: 'valueB',
					_hlc: '2023-01-01T00:00:00.000Z-000000-def456' as HLC,
				},
			},
		};
		const result = mergeDocuments<typeof objectSchema>(docA, docB);
		expect(result._hash).toBeDefined();
		expect(result._hash).not.toBe('hashA');
		expect(result._hash).not.toBe('hashB');
		expect(typeof result._hash).toBe('string');
	});
});
