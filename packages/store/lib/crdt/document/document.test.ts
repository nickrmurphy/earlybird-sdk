import { describe, expect, it, vi } from 'vitest';
import type { IHLC } from '../../types';
import { makeDocument, mergeDocuments, updateDocument } from './document';

describe('makeDocument', () => {
	it('creates a document with correct structure', () => {
		const mockHLC: Pick<IHLC, 'tick'> = {
			tick: vi.fn().mockReturnValue('timestamp-1'),
		};

		const entity = { id: 'user-1', name: 'John', age: 30 };
		const doc = makeDocument(mockHLC, entity);

		expect(doc.$id).toBe('user-1');
		expect(doc.$data).toEqual(entity);
		expect(doc.$timestamp).toBe('timestamp-1');
		expect(doc.$timestamps).toEqual({
			id: 'timestamp-1',
			name: 'timestamp-1',
			age: 'timestamp-1',
		});
		expect(typeof doc.$hash).toBe('string');
		expect(doc.$hash.length).toBeGreaterThan(0);
	});

	it('calls tick for each property plus document timestamp', () => {
		const mockTick = vi.fn().mockReturnValue('ts');
		const mockHLC: Pick<IHLC, 'tick'> = { tick: mockTick };

		const entity = { id: 'test', prop1: 'value1', prop2: 'value2' };
		makeDocument(mockHLC, entity);

		expect(mockTick).toHaveBeenCalledTimes(4); // 3 for properties + 1 for document timestamp
	});
});

describe('updateDocument', () => {
	it('updates document with new data', () => {
		const mockHLC: Pick<IHLC, 'tick'> = {
			tick: vi.fn().mockReturnValue('timestamp-2'),
		};

		const originalDoc = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'John', age: 30 },
			$timestamp: 'timestamp-1',
			$timestamps: {
				id: 'timestamp-1',
				name: 'timestamp-1',
				age: 'timestamp-1',
			},
			$hash: 'original-hash',
		};

		const updates = { name: 'Jane', age: 31 };
		const updatedDoc = updateDocument(mockHLC, originalDoc, updates);

		expect(updatedDoc.$id).toBe('user-1');
		expect(updatedDoc.$data).toEqual({
			id: 'user-1',
			name: 'Jane',
			age: 31,
		});
		expect(updatedDoc.$timestamp).toBe('timestamp-2');
		expect(updatedDoc.$timestamps).toEqual({
			id: 'timestamp-1',
			name: 'timestamp-2',
			age: 'timestamp-2',
		});
		expect(updatedDoc.$hash).not.toBe('original-hash');
	});

	it('preserves unchanged fields and timestamps', () => {
		const mockHLC: Pick<IHLC, 'tick'> = {
			tick: vi.fn().mockReturnValue('timestamp-2'),
		};

		const originalDoc = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'John', age: 30 },
			$timestamp: 'timestamp-1',
			$timestamps: {
				id: 'timestamp-1',
				name: 'timestamp-1',
				age: 'timestamp-1',
			},
			$hash: 'original-hash',
		};

		const updates = { name: 'Jane' };
		const updatedDoc = updateDocument(mockHLC, originalDoc, updates);

		expect(updatedDoc.$data.age).toBe(30);
		expect(updatedDoc.$timestamp).toBe('timestamp-2');
		expect(updatedDoc.$timestamps.id).toBe('timestamp-1');
		expect(updatedDoc.$timestamps.age).toBe('timestamp-1');
		expect(updatedDoc.$timestamps.name).toBe('timestamp-2');
	});
});

describe('mergeDocuments', () => {
	it('merges only fields with newer timestamps', () => {
		const target = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'John', age: 30 },
			$timestamp: '2023-01-01T00:00:00.000Z-000000-a',
			$timestamps: {
				id: '2023-01-01T00:00:00.000Z-000000-a',
				name: '2023-01-01T00:00:00.000Z-000000-a',
				age: '2023-01-01T00:00:00.000Z-000000-a',
			},
			$hash: 'target-hash',
		};

		const source = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Jane', age: 25 },
			$timestamp: '2023-01-02T00:00:00.000Z-000000-b',
			$timestamps: {
				id: '2023-01-01T00:00:00.000Z-000000-a',
				name: '2023-01-02T00:00:00.000Z-000000-b',
				age: '2022-12-31T00:00:00.000Z-000000-z',
			},
			$hash: 'source-hash',
		};

		const merged = mergeDocuments(target, source);

		expect(merged.$id).toBe('user-1');
		expect(merged.$data).toEqual({
			id: 'user-1',
			name: 'Jane',
			age: 30,
		});
		expect(merged.$timestamp).toBe('2023-01-02T00:00:00.000Z-000000-b');
		expect(merged.$timestamps).toEqual({
			id: '2023-01-01T00:00:00.000Z-000000-a',
			name: '2023-01-02T00:00:00.000Z-000000-b',
			age: '2023-01-01T00:00:00.000Z-000000-a',
		});
		expect(merged.$hash).not.toBe('target-hash');
		expect(merged.$hash).not.toBe('source-hash');
	});

	it('keeps all target fields when source has older timestamps', () => {
		const target = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'John', age: 30 },
			$timestamp: '2023-01-02T00:00:00.000Z-000000-b',
			$timestamps: {
				id: '2023-01-02T00:00:00.000Z-000000-b',
				name: '2023-01-02T00:00:00.000Z-000000-b',
				age: '2023-01-02T00:00:00.000Z-000000-b',
			},
			$hash: 'target-hash',
		};

		const source = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Jane', age: 25 },
			$timestamp: '2023-01-01T00:00:00.000Z-000000-a',
			$timestamps: {
				id: '2023-01-01T00:00:00.000Z-000000-a',
				name: '2023-01-01T00:00:00.000Z-000000-a',
				age: '2023-01-01T00:00:00.000Z-000000-a',
			},
			$hash: 'source-hash',
		};

		const merged = mergeDocuments(target, source);

		expect(merged.$data).toEqual(target.$data);
		expect(merged.$timestamps).toEqual(target.$timestamps);
		expect(merged.$timestamp).toBe(target.$timestamp);
	});

	it('takes all source fields when source has newer timestamps', () => {
		const target = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'John', age: 30 },
			$timestamp: '2023-01-01T00:00:00.000Z-000000-a',
			$timestamps: {
				id: '2023-01-01T00:00:00.000Z-000000-a',
				name: '2023-01-01T00:00:00.000Z-000000-a',
				age: '2023-01-01T00:00:00.000Z-000000-a',
			},
			$hash: 'target-hash',
		};

		const source = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Jane', age: 25 },
			$timestamp: '2023-01-02T00:00:00.000Z-000000-b',
			$timestamps: {
				id: '2023-01-02T00:00:00.000Z-000000-b',
				name: '2023-01-02T00:00:00.000Z-000000-b',
				age: '2023-01-02T00:00:00.000Z-000000-b',
			},
			$hash: 'source-hash',
		};

		const merged = mergeDocuments(target, source);

		expect(merged.$data).toEqual(source.$data);
		expect(merged.$timestamps).toEqual(source.$timestamps);
		expect(merged.$timestamp).toBe(source.$timestamp);
	});

	it('handles equal timestamps correctly', () => {
		const timestamp = '2023-01-01T00:00:00.000Z-000000-a';
		const target = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'John' },
			$timestamp: timestamp,
			$timestamps: {
				id: timestamp,
				name: timestamp,
			},
			$hash: 'target-hash',
		};

		const source = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Jane' },
			$timestamp: timestamp,
			$timestamps: {
				id: timestamp,
				name: timestamp,
			},
			$hash: 'source-hash',
		};

		const merged = mergeDocuments(target, source);

		expect(merged.$data).toEqual(target.$data);
		expect(merged.$timestamps).toEqual(target.$timestamps);
		expect(merged.$timestamp).toBe(timestamp);
	});

	it('recalculates hash based on merged data', () => {
		const target = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'John', age: 30 },
			$timestamp: '2023-01-01T00:00:00.000Z-000000-a',
			$timestamps: {
				id: '2023-01-01T00:00:00.000Z-000000-a',
				name: '2023-01-01T00:00:00.000Z-000000-a',
				age: '2023-01-01T00:00:00.000Z-000000-a',
			},
			$hash: 'target-hash',
		};

		const source = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Jane', age: 25 },
			$timestamp: '2023-01-02T00:00:00.000Z-000000-b',
			$timestamps: {
				id: '2023-01-01T00:00:00.000Z-000000-a',
				name: '2023-01-02T00:00:00.000Z-000000-b',
				age: '2023-01-01T00:00:00.000Z-000000-a',
			},
			$hash: 'source-hash',
		};

		const merged = mergeDocuments(target, source);

		expect(merged.$hash).not.toBe('target-hash');
		expect(merged.$hash).not.toBe('source-hash');
		expect(typeof merged.$hash).toBe('string');
		expect(merged.$hash.length).toBeGreaterThan(0);
	});
});
