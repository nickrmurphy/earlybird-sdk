import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { addDocument, getDocument, openDatabase, putDocument, getAllDocuments, addDocuments, putDocuments, queryDocuments } from './operations';
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
	describe('getDocument', () => {
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

		it('should retrieve a document by its ID', async () => {
			const testDocument: Document<{ id: string; name: string }> = {
				$id: 'user-1',
				$data: { id: 'user-1', name: 'John Doe' },
				$hash: 'test-hash-1',
				$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' }
			};

			await addDocument(db, 'users', testDocument);

			const result = await getDocument(db, 'users', 'user-1');

			expect(result).toEqual(testDocument);
		});

		it('should return null if the document does not exist', async () => {
			const result = await getDocument(db, 'users', 'nonexistent-id');

			expect(result).toBeNull();
		});

		it('should reject if the store does not exist', async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
			await expect(getDocument(db, 'nonexistent-store' as any, 'user-1')).rejects.toThrow();
		});
	});
});
describe('putDocument', () => {
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

	it('should insert a new document if it does not exist', async () => {
		const doc: Document<{ id: string; name: string }> = {
			$id: 'put-user-1',
			$data: { id: 'put-user-1', name: 'Put User' },
			$hash: 'put-hash-1',
			$timestamps: { id: '2024-01-01T00:10:00Z', name: '2024-01-01T00:10:00Z' }
		};

		await expect(putDocument(db, 'users', doc)).resolves.toBeUndefined();

		const stored = await getDocument(db, 'users', 'put-user-1');
		expect(stored).toEqual(doc);
	});

	it('should update an existing document', async () => {
		const doc: Document<{ id: string; name: string }> = {
			$id: 'put-user-2',
			$data: { id: 'put-user-2', name: 'Original Name' },
			$hash: 'put-hash-2',
			$timestamps: { id: '2024-01-01T00:11:00Z', name: '2024-01-01T00:11:00Z' }
		};
		await putDocument(db, 'users', doc);

		const updatedDoc: Document<{ id: string; name: string }> = {
			...doc,
			$data: { id: 'put-user-2', name: 'Updated Name' },
			$hash: 'put-hash-2b'
		};
		await expect(putDocument(db, 'users', updatedDoc)).resolves.toBeUndefined();

		const stored = await getDocument(db, 'users', 'put-user-2');
		expect(stored).toEqual(updatedDoc);
	});

	it('should reject if the store does not exist', async () => {
		const doc: Document<{ id: string; name: string }> = {
			$id: 'put-user-3',
			$data: { id: 'put-user-3', name: 'No Store' },
			$hash: 'put-hash-3',
			$timestamps: { id: '2024-01-01T00:12:00Z', name: '2024-01-01T00:12:00Z' }
		};
		// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
		await expect(putDocument(db, 'nonexistent-store' as any, doc)).rejects.toThrow();
	});
});
describe('getAllDocuments', () => {
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

	it('should return all documents in the store', async () => {
		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' }
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamps: { id: '2024-01-01T00:01:00Z', name: '2024-01-01T00:01:00Z' }
			}
		];
		for (const doc of docs) {
			await addDocument(db, 'users', doc);
		}
		const allDocs = await getAllDocuments(db, 'users');
		expect(allDocs).toHaveLength(2);
		expect(allDocs).toEqual(expect.arrayContaining(docs));
	});

	it('should return an empty array if the store is empty', async () => {
		const allDocs = await getAllDocuments(db, 'users');
		expect(allDocs).toEqual([]);
	});

	it('should reject if the store does not exist', async () => {
		// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
		await expect(getAllDocuments(db, 'nonexistent-store' as any)).rejects.toThrow();
	});
});
describe('addDocuments', () => {
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

	it('should add multiple documents to the store', async () => {
		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' }
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamps: { id: '2024-01-01T00:01:00Z', name: '2024-01-01T00:01:00Z' }
			}
		];
		await expect(addDocuments(db, 'users', docs)).resolves.toBeUndefined();
		const allDocs = await getAllDocuments(db, 'users');
		expect(allDocs).toHaveLength(2);
		expect(allDocs).toEqual(expect.arrayContaining(docs));
	});

	it('should reject if any document is a duplicate', async () => {
		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' }
			},
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Duplicate' },
				$hash: 'hash-dup',
				$timestamps: { id: '2024-01-01T00:02:00Z', name: '2024-01-01T00:02:00Z' }
			}
		];
		await expect(addDocuments(db, 'users', docs)).rejects.toThrow();
	});
});

describe('putDocuments', () => {
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

	it('should insert or update multiple documents', async () => {
		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' }
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamps: { id: '2024-01-01T00:01:00Z', name: '2024-01-01T00:01:00Z' }
			}
		];
		await expect(putDocuments(db, 'users', docs)).resolves.toBeUndefined();
		const allDocs = await getAllDocuments(db, 'users');
		expect(allDocs).toHaveLength(2);
		expect(allDocs).toEqual(expect.arrayContaining(docs));

		// Update one document
		const updatedDocs = [
			{ ...docs[0], $data: { id: 'user-1', name: 'Alice Updated' }, $hash: 'hash-1b' },
			{ ...docs[1], $data: { id: 'user-2', name: 'Bob Updated' }, $hash: 'hash-2b' }
		];
		await expect(putDocuments(db, 'users', updatedDocs)).resolves.toBeUndefined();
		const updatedAll = await getAllDocuments(db, 'users');
		expect(updatedAll).toHaveLength(2);
		expect(updatedAll).toEqual(expect.arrayContaining(updatedDocs));
	});

	it('should reject if the store does not exist', async () => {
		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' }
			}
		];
		// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
		await expect(putDocuments(db, 'nonexistent-store' as any, docs)).rejects.toThrow();
	});
});
describe('queryDocuments', () => {
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

	it('should return only documents matching the predicate', async () => {
		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' }
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamps: { id: '2024-01-01T00:01:00Z', name: '2024-01-01T00:01:00Z' }
			},
			{
				$id: 'user-3',
				$data: { id: 'user-3', name: 'Carol' },
				$hash: 'hash-3',
				$timestamps: { id: '2024-01-01T00:02:00Z', name: '2024-01-01T00:02:00Z' }
			}
		];
		await addDocuments(db, 'users', docs);
		const result = await queryDocuments(db, 'users', data => data.name.startsWith('A'));
		expect(result).toHaveLength(1);
		expect(result[0].$data.name).toBe('Alice');
	});

	it('should return an empty array if no documents match', async () => {
		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' }
			}
		];
		await addDocuments(db, 'users', docs);
		const result = await queryDocuments(db, 'users', data => data.name === 'Nonexistent');
		expect(result).toEqual([]);
	});

	it('should reject if the store does not exist', async () => {
		const predicate = () => true;
		// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
		await expect(queryDocuments(db, 'nonexistent-store' as any, predicate)).rejects.toThrow();
	});
});