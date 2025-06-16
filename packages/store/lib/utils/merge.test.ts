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
			$value: 'old',
			$hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC,
		};
		const fieldB = {
			$value: 'new',
			$hlc: '2023-01-01T00:00:01.000Z-000000-def456' as HLC,
		};
		const result = mergeFields<typeof stringSchema>(fieldA, fieldB);
		expect(result).toBe(fieldB);
	});
});

describe('mergeDocuments', () => {
	test('merges documents with no conflicts', () => {
		const docA = {
			$hash: 'hashA',
			$value: {
				a: {
					$value: 'valueA',
					$hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC,
				},
			},
		};
		const docB = {
			$hash: 'hashB',
			$value: {
				b: {
					$value: 'valueB',
					$hlc: '2023-01-01T00:00:00.000Z-000000-def456' as HLC,
				},
			},
		};
		const result = mergeDocuments<typeof objectSchema>(docA, docB);
		expect(result.$value.a.$value).toBe('valueA');
		expect(result.$value.b.$value).toBe('valueB');
	});

	test('resolves conflicts using HLC', () => {
		const docA = {
			$hash: 'hashA',
			$value: {
				key: {
					$value: 'old',
					$hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC,
				},
			},
		};
		const docB = {
			$hash: 'hashB',
			$value: {
				key: {
					$value: 'new',
					$hlc: '2023-01-01T00:00:01.000Z-000000-def456' as HLC,
				},
			},
		};
		const keyObjectSchema = z.object({
			key: stringSchema,
		});
		const result = mergeDocuments<typeof keyObjectSchema>(docA, docB);
		expect(result.$value.key.$value).toBe('new');
	});

	test('generates new hash for merged document', () => {
		const docA = {
			$hash: 'hashA',
			$value: {
				a: {
					$value: 'valueA',
					$hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC,
				},
			},
		};
		const docB = {
			$hash: 'hashB',
			$value: {
				b: {
					$value: 'valueB',
					$hlc: '2023-01-01T00:00:00.000Z-000000-def456' as HLC,
				},
			},
		};
		const result = mergeDocuments<typeof objectSchema>(docA, docB);
		expect(result.$hash).toBeDefined();
		expect(result.$hash).not.toBe('hashA');
		expect(result.$hash).not.toBe('hashB');
		expect(typeof result.$hash).toBe('string');
	});
});
