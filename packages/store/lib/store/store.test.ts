/// <reference types="@vitest/browser/providers/playwright" />

import type { HLC } from '../crdt/hlc';
import type { StorageAdapter } from '../storage/types';
import type { CRDTStore } from './store';

import { Directory, Filesystem } from '@capacitor/filesystem';
import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { createCapacitorAdapter } from '../storage/capacitor-adapter';
import { createMemoryAdapter } from '../storage/memory-adapter';
import { createStore } from './store';

const todoSchema = z.object({
	title: z.string().min(2).max(100),
	completed: z.boolean().default(false),
});

type AdapterFactory = () => StorageAdapter;

const createStoreTests = (
	adapterName: string,
	createAdapter: AdapterFactory,
) => {
	describe(`Store with ${adapterName}`, () => {
		// Use unique collection name to prevent test interference
		const collectionName = `test-${adapterName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 9)}`;
		test('should return all items deserialized', async () => {
			const exampleStoreData: CRDTStore<typeof todoSchema> = {
				'123': {
					$hash: 'example-hash',
					$hlc: 'some-example-hlc',
					$value: {
						title: {
							$value: 'Example Todo',
							$hlc: 'some-example-hlc' as HLC,
						},
						completed: {
							$value: false,
							$hlc: 'some-example-hlc' as HLC,
						},
					},
				},
			};

			const adapter = createAdapter();
			await adapter.saveData(JSON.stringify(exampleStoreData));

			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			const items = await store.all();
			expect(items).toEqual({
				'123': { title: 'Example Todo', completed: false },
			});
		});

		test('should return a single item deserialized', async () => {
			const exampleStoreData: CRDTStore<typeof todoSchema> = {
				'123': {
					$hash: 'example-hash',
					$hlc: 'some-example-hlc',
					$value: {
						title: {
							$value: 'Example Todo',
							$hlc: 'some-example-hlc' as HLC,
						},
						completed: {
							$value: false,
							$hlc: 'some-example-hlc' as HLC,
						},
					},
				},
			};

			const adapter = createAdapter();
			await adapter.saveData(JSON.stringify(exampleStoreData));

			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			const item = await store.get('123');
			expect(item).toEqual({ title: 'Example Todo', completed: false });
		});

		test('should create a new item', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			const id = '1234';
			await store.create(id, { title: 'New Todo', completed: false });
			const item = await store.get(id);
			expect(item).toEqual({ title: 'New Todo', completed: false });
		});

		test('should create multiple new items', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			const payload = [
				{ id: '1234', value: { title: 'New Todo 1', completed: false } },
				{ id: '5678', value: { title: 'New Todo 2', completed: true } },
			];

			await store.createMany(payload);
			const items = await store.all();
			expect(items).toEqual({
				'1234': { title: 'New Todo 1', completed: false },
				'5678': { title: 'New Todo 2', completed: true },
			});
		});

		test('should update an item', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			await store.create('123', { title: 'Old title', completed: false });
			await store.update('123', { title: 'New title' });
			const item = await store.get('123');
			expect(item).toEqual({ title: 'New title', completed: false });
		});

		test('should update many items', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			await store.createMany([
				{ id: '1234', value: { title: 'New Todo 1', completed: false } },
				{ id: '5678', value: { title: 'New Todo 2', completed: true } },
			]);
			await store.updateMany([
				{ id: '1234', value: { title: 'Updated Todo 1', completed: true } },
				{ id: '5678', value: { title: 'Updated Todo 2', completed: false } },
			]);
			const items = await store.all();
			expect(items).toEqual({
				'1234': { title: 'Updated Todo 1', completed: true },
				'5678': { title: 'Updated Todo 2', completed: false },
			});
		});

		test('should call listeners on mutate', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			const mockFn = vi.fn();

			store.registerListener('mutate', mockFn);
			await store.create('123', { title: 'Old title', completed: false });
			expect(mockFn).toHaveBeenCalledTimes(1);
			await store.update('123', { title: 'New title' });
			expect(mockFn).toHaveBeenCalledTimes(2);
			await store.createMany([
				{ id: '1234', value: { title: 'New Todo 1', completed: false } },
				{ id: '5678', value: { title: 'New Todo 2', completed: true } },
			]);
			expect(mockFn).toHaveBeenCalledTimes(3);
			await store.updateMany([
				{ id: '1234', value: { title: 'Updated Todo 1', completed: true } },
				{ id: '5678', value: { title: 'Updated Todo 2', completed: false } },
			]);
			expect(mockFn).toHaveBeenCalledTimes(4);
		});

		test('should not call unregistered listeners', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			const mockFn = vi.fn();

			store.registerListener('mutate', mockFn);
			await store.create('123', { title: 'Old title', completed: false });
			expect(mockFn).toHaveBeenCalledTimes(1);

			store.unregisterListener('mutate');
			await store.create('456', { title: 'New title', completed: true });

			expect(mockFn).toHaveBeenCalledTimes(1);
		});

		test('should return document hashes', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			await store.create('123', { title: 'Todo 1', completed: false });
			await store.create('456', { title: 'Todo 2', completed: true });

			const hashes = await store.getHashes();
			expect(hashes).toHaveProperty('root');
			expect(hashes).toHaveProperty('buckets');
			expect(typeof hashes.root).toBe('string');
			expect(hashes.root.length).toBeGreaterThan(0);
			expect(typeof hashes.buckets).toBe('object');
			expect(hashes.buckets['0']).toBeDefined();
		});

		test('should return empty hashes when getting hashes from uninitialized store', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			const hashes = await store.getHashes();
			expect(hashes).toEqual({ root: '', buckets: {} });
		});

		test('should get documents by bucket indices', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			// Create multiple documents
			await store.create('1', { title: 'Todo 1', completed: false });
			await store.create('2', { title: 'Todo 2', completed: true });
			await store.create('3', { title: 'Todo 3', completed: false });

			// Get documents from bucket 0
			const docs = await store.getDocumentsByBucket([0]);
			expect(Array.isArray(docs)).toBe(true);
			expect(docs.length).toBeGreaterThan(0);

			// Each document should have CRDT structure
			for (const doc of docs) {
				expect(doc).toHaveProperty('$hash');
				expect(doc).toHaveProperty('$hlc');
				expect(doc).toHaveProperty('$value');
				expect(typeof doc.$hash).toBe('string');
				expect(typeof doc.$hlc).toBe('string');
				expect(typeof doc.$value).toBe('object');
			}
		});

		test('should return empty array for non-existent bucket', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			await store.create('1', { title: 'Todo 1', completed: false });

			const docs = await store.getDocumentsByBucket([999]);
			expect(docs).toEqual([]);
		});

		test('should return empty array for empty bucket indices', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			await store.create('1', { title: 'Todo 1', completed: false });

			const docs = await store.getDocumentsByBucket([]);
			expect(docs).toEqual([]);
		});

		test('should get documents from multiple buckets', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			// Create enough documents to span multiple buckets (100+ documents)
			const promises: Promise<unknown>[] = [];
			for (let i = 0; i < 150; i++) {
				promises.push(
					store.create(`doc-${i}`, {
						title: `Todo ${i}`,
						completed: i % 2 === 0,
					}),
				);
			}
			await Promise.all(promises);

			// Get documents from buckets 0 and 1
			const docs = await store.getDocumentsByBucket([0, 1]);
			expect(Array.isArray(docs)).toBe(true);
			expect(docs.length).toBe(150); // All documents should be returned

			// Verify documents are sorted by HLC
			for (let i = 1; i < docs.length; i++) {
				expect(docs[i].$hlc >= docs[i - 1].$hlc).toBe(true);
			}
		});

		test('should merge external store data', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			// Create initial data
			await store.create('123', { title: 'Original Todo', completed: false });

			// External store data to merge
			const externalStore: CRDTStore<typeof todoSchema> = {
				'456': {
					$hash: 'external-hash-456',
					$hlc: 'external-hlc-456',
					$value: {
						title: {
							$value: 'External Todo',
							$hlc: 'external-hlc-456' as HLC,
						},
						completed: {
							$value: true,
							$hlc: 'external-hlc-456' as HLC,
						},
					},
				},
			};

			store.merge(externalStore);

			const items = await store.all();
			expect(items).toEqual({
				'123': { title: 'Original Todo', completed: false },
				'456': { title: 'External Todo', completed: true },
			});
		});

		test('should merge conflicting documents using CRDT resolution', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			// Create initial data
			await store.create('123', { title: 'Original Todo', completed: false });

			// External store data with same ID but different values
			const externalStore: CRDTStore<typeof todoSchema> = {
				'123': {
					$hash: 'external-hash-123',
					$hlc: 'external-hlc-123',
					$value: {
						title: {
							$value: 'Conflicting Todo Title',
							$hlc: 'external-hlc-123' as HLC,
						},
						completed: {
							$value: true,
							$hlc: 'external-hlc-123' as HLC,
						},
					},
				},
			};

			store.merge(externalStore);

			// The merge should resolve conflicts using CRDT merge logic
			const item = await store.get('123');
			expect(item).toBeDefined();
			expect(item?.title).toBe('Conflicting Todo Title');
			expect(item?.completed).toBe(true);
		});

		test('should merge into uninitialized store after auto-initialization', async () => {
			const adapter = createAdapter();
			const store = createStore(collectionName, {
				schema: todoSchema,
				adapter,
			});

			const externalStore: CRDTStore<typeof todoSchema> = {
				'123': {
					$hash: 'external-hash',
					$hlc: 'external-hlc',
					$value: {
						title: {
							$value: 'External Todo',
							$hlc: 'external-hlc' as HLC,
						},
						completed: {
							$value: true,
							$hlc: 'external-hlc' as HLC,
						},
					},
				},
			};

			await store.merge(externalStore);

			const item = await store.get('123');
			expect(item).toEqual({ title: 'External Todo', completed: true });
		});
	});
};

createStoreTests('Memory Adapter', () => createMemoryAdapter());
createStoreTests('Capacitor Adapter', () =>
	createCapacitorAdapter(
		`capacitor-test-${Math.random().toString(36).substring(2, 9)}`,
		{
			fs: Filesystem,
			directory: Directory.Temporary,
		},
	),
);
