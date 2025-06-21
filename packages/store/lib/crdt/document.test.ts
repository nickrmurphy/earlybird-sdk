import { describe, expect, it, vi } from 'vitest';
import type { HLC } from '../types';
import { makeDocument, updateDocument } from './document';

describe('makeDocument', () => {
	it('creates a document with correct structure', () => {
		const mockHLC: Pick<HLC, 'tick'> = {
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
		const mockHLC: Pick<HLC, 'tick'> = { tick: mockTick };

		const entity = { id: 'test', prop1: 'value1', prop2: 'value2' };
		makeDocument(mockHLC, entity);

		expect(mockTick).toHaveBeenCalledTimes(4); // 3 for properties + 1 for document timestamp
	});
});

describe('updateDocument', () => {
	it('updates document with new data', () => {
		const mockHLC: Pick<HLC, 'tick'> = {
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
		const mockHLC: Pick<HLC, 'tick'> = {
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
