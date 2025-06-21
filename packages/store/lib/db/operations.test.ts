import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { addDocument, openDatabase } from './operations';
import type { DatabaseConfig, Document, TypedDatabase, EntitySchema } from '../types';

const userSchema = z.object({
	id: z.string(),
	name: z.string()
}) as EntitySchema<{ id: string; name: string }>;

const postSchema = z.object({
	id: z.string(),
	title: z.string()
}) as EntitySchema<{ id: string; title: string }>;

describe('openDatabase', () => {
	let dbName: string;

	beforeEach(() => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
	});

	afterEach(async () => {
		// Clean up test databases
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('opens database with correct name and version', async () => {
		const config: DatabaseConfig = {
			name: dbName,
			version: 1,
			stores: {
				users: userSchema
			}
		};

		const db = await openDatabase(config);

		expect(db.name).toBe(dbName);
		expect(db.version).toBe(1);

		db.close();
	});

	it('creates object stores for each schema', async () => {
		const config: DatabaseConfig = {
			name: dbName,
			version: 1,
			stores: {
				users: userSchema,
				posts: postSchema
			}
		};

		const db = await openDatabase(config);

		expect(db.objectStoreNames.contains('users')).toBe(true);
		expect(db.objectStoreNames.contains('posts')).toBe(true);
		expect(db.objectStoreNames.length).toBe(2);

		db.close();
	});

	it('creates indexes for CRDT fields', async () => {
		const config: DatabaseConfig = {
			name: dbName,
			version: 1,
			stores: {
				users: userSchema
			}
		};

		const db = await openDatabase(config);

		const transaction = db.transaction(['users'], 'readonly');
		const store = transaction.objectStore('users');

		expect(store.indexNames.contains('$hash')).toBe(true);
		expect(store.indexNames.contains('$timestamps')).toBe(true);
		expect(store.indexNames.contains('$data')).toBe(true);
		expect(store.keyPath).toBe('$id');

		db.close();
	});

	it('handles single store configuration', async () => {
		const config: DatabaseConfig = {
			name: dbName,
			version: 1,
			stores: {
				users: userSchema
			}
		};

		const db = await openDatabase(config);

		expect(db.objectStoreNames.length).toBe(1);
		expect(db.objectStoreNames.contains('users')).toBe(true);

		db.close();
	});
});

describe('addDocument', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof userSchema;
		};
	}>;
	let dbName: string;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: userSchema
			}
		};
		db = await openDatabase(config);
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('should successfully add a document to the store', async () => {
		const testDocument: Document<{ id: string; name: string }> = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'John Doe' },
			$hash: 'test-hash-1',
			$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' }
		};

		// Uncomment line below to test TypeScript error for invalid store name:
		// await expect(addDocument(db, 'invalid_store_name', testDocument)).resolves.toBeUndefined();

		await expect(addDocument(db, 'users', testDocument)).resolves.toBeUndefined();
	});

	it('should store document with correct structure', async () => {
		const testDocument: Document<{ id: string; name: string }> = {
			$id: 'user-2',
			$data: { id: 'user-2', name: 'Jane Smith' },
			$hash: 'test-hash-2',
			$timestamps: { id: '2024-01-01T00:01:00Z', name: '2024-01-01T00:01:00Z' }
		};

		await addDocument(db, 'users', testDocument);

		// Verify document was stored correctly
		const transaction = db.transaction('users', 'readonly');
		const store = transaction.objectStore('users');
		const result = await new Promise<Document<{ id: string; name: string }>>((resolve, reject) => {
			const request = store.get('user-2');
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		expect(result).toEqual(testDocument);
	});

	it('should reject when store does not exist', async () => {
		const testDocument: Document<{ id: string; name: string }> = {
			$id: 'user-3',
			$data: { id: 'user-3', name: 'Bob Wilson' },
			$hash: 'test-hash-3',
			$timestamps: { id: '2024-01-01T00:02:00Z', name: '2024-01-01T00:02:00Z' }
		};

		// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
		await expect(addDocument(db, 'nonexistent-store' as any, testDocument))
			.rejects
			.toThrow();
	});

	it('should reject when adding duplicate document with same $id', async () => {
		const firstDocument: Document<{ id: string; name: string }> = {
			$id: 'duplicate-user',
			$data: { id: 'duplicate-user', name: 'First User' },
			$hash: 'hash-1',
			$timestamps: { id: '2024-01-01T00:03:00Z', name: '2024-01-01T00:03:00Z' }
		};

		const secondDocument: Document<{ id: string; name: string }> = {
			$id: 'duplicate-user',
			$data: { id: 'duplicate-user', name: 'Second User' },
			$hash: 'hash-2',
			$timestamps: { id: '2024-01-01T00:04:00Z', name: '2024-01-01T00:04:00Z' }
		};

		await addDocument(db, 'users' as const, firstDocument);

		await expect(addDocument(db, 'users' as const, secondDocument))
			.rejects
			.toThrow();
	});

	it('should handle documents with all required CRDT fields', async () => {
		const testDocument: Document<{ id: string; name: string }> = {
			$id: 'user-with-fields',
			$data: { id: 'user-with-fields', name: 'Complete User' },
			$hash: 'complete-hash',
			$timestamps: { id: '2024-01-01T00:05:00Z', name: '2024-01-01T00:05:00Z' }
		};

		await addDocument(db, 'users' as const, testDocument);

		// Verify all fields are accessible via indexes
		const transaction = db.transaction('users', 'readonly');
		const store = transaction.objectStore('users');

		const hashIndex = store.index('$hash');
		const hashResult = await new Promise((resolve, reject) => {
			const request = hashIndex.get('complete-hash');
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		expect(hashResult).toEqual(testDocument);
	});

});