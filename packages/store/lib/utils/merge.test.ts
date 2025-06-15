import { describe, test, expect } from 'vitest';
import type { HLC } from './hlc';
import { mergeFields, mergeDocuments } from './merge';

describe('mergeFields', () => {
	test('returns field with higher HLC', () => {
		const fieldA = { _value: 'old', _hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC };
		const fieldB = { _value: 'new', _hlc: '2023-01-01T00:00:01.000Z-000000-def456' as HLC };
		const result = mergeFields(fieldA, fieldB);
		expect(result).toBe(fieldB);
	});
});

describe('mergeDocuments', () => {
	test('merges documents with no conflicts', () => {
		const docA = { a: { _value: 'valueA', _hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC } };
		const docB = { b: { _value: 'valueB', _hlc: '2023-01-01T00:00:00.000Z-000000-def456' as HLC } };
		const result = mergeDocuments(docA, docB);
		expect(result.a._value).toBe('valueA');
		expect(result.b._value).toBe('valueB');
	});

	test('resolves conflicts using HLC', () => {
		const docA = { 
			key: { _value: 'old', _hlc: '2023-01-01T00:00:00.000Z-000000-abc123' as HLC }
		};
		const docB = { 
			key: { _value: 'new', _hlc: '2023-01-01T00:00:01.000Z-000000-def456' as HLC }
		};
		const result = mergeDocuments(docA, docB);
		expect(result.key._value).toBe('new');
	});
});