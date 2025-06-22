import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { testPostSchema, testUserSchema } from '../testing/factories';
import type { DatabaseConfig, Document, TypedDatabase } from '../types';
import {
	addDocument,
	addDocuments,
	getAllDocuments,
	getDocument,
	getHLC,
	mergeDocuments,
	openDatabase,
	putDocument,
	putDocuments,
	putHLC,
	queryDocuments,
} from './operations';

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
				users: testUserSchema,
			},
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
				users: testUserSchema,
				posts: testPostSchema,
			},
		};

		const db = await openDatabase(config);

		expect(db.objectStoreNames.contains('users')).toBe(true);
		expect(db.objectStoreNames.contains('posts')).toBe(true);
		expect(db.objectStoreNames.length).toBe(3);

		db.close();
	});

	it('creates indexes for CRDT fields', async () => {
		const config: DatabaseConfig = {
			name: dbName,
			version: 1,
			stores: {
				users: testUserSchema,
			},
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
				users: testUserSchema,
			},
		};

		const db = await openDatabase(config);

		expect(db.objectStoreNames.length).toBe(2);
		expect(db.objectStoreNames.contains('users')).toBe(true);

		db.close();
	});
});

describe('addDocument', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof testUserSchema;
		};
	}>;
	let dbName: string;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: testUserSchema,
			},
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
			$timestamp: '2024-01-01T00:00:00Z',
			$timestamps: { id: '2024-01-01T00:00:00Z', name: '2024-01-01T00:00:00Z' },
		};

		// Uncomment line below to test TypeScript error for invalid store name:
		// await expect(addDocument(db, 'invalid_store_name', testDocument)).resolves.toBeUndefined();

		await expect(
			addDocument(db, 'users', testDocument),
		).resolves.toBeUndefined();
	});

	it('should store document with correct structure', async () => {
		const testDocument: Document<{ id: string; name: string }> = {
			$id: 'user-2',
			$data: { id: 'user-2', name: 'Jane Smith' },
			$hash: 'test-hash-2',
			$timestamp: '2024-01-01T00:01:00Z',
			$timestamps: { id: '2024-01-01T00:01:00Z', name: '2024-01-01T00:01:00Z' },
		};

		await addDocument(db, 'users', testDocument);

		// Verify document was stored correctly
		const transaction = db.transaction('users', 'readonly');
		const store = transaction.objectStore('users');
		const result = await new Promise<Document<{ id: string; name: string }>>(
			(resolve, reject) => {
				const request = store.get('user-2');
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			},
		);

		expect(result).toEqual(testDocument);
	});

	it('should reject when store does not exist', async () => {
		const testDocument: Document<{ id: string; name: string }> = {
			$id: 'user-3',
			$data: { id: 'user-3', name: 'Bob Wilson' },
			$hash: 'test-hash-3',
			$timestamp: '2024-01-01T00:02:00Z',
			$timestamps: { id: '2024-01-01T00:02:00Z', name: '2024-01-01T00:02:00Z' },
		};

		await expect(
			// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
			addDocument(db, 'nonexistent-store' as any, testDocument),
		).rejects.toThrow();
	});

	it('should reject when adding duplicate document with same $id', async () => {
		const firstDocument: Document<{ id: string; name: string }> = {
			$id: 'duplicate-user',
			$data: { id: 'duplicate-user', name: 'First User' },
			$hash: 'hash-1',
			$timestamp: '2024-01-01T00:03:00Z',
			$timestamps: { id: '2024-01-01T00:03:00Z', name: '2024-01-01T00:03:00Z' },
		};

		const secondDocument: Document<{ id: string; name: string }> = {
			$id: 'duplicate-user',
			$data: { id: 'duplicate-user', name: 'Second User' },
			$hash: 'hash-2',
			$timestamp: '2024-01-01T00:04:00Z',
			$timestamps: { id: '2024-01-01T00:04:00Z', name: '2024-01-01T00:04:00Z' },
		};

		await addDocument(db, 'users' as const, firstDocument);

		await expect(
			addDocument(db, 'users' as const, secondDocument),
		).rejects.toThrow();
	});

	it('should handle documents with all required CRDT fields', async () => {
		const testDocument: Document<{ id: string; name: string }> = {
			$id: 'user-with-fields',
			$data: { id: 'user-with-fields', name: 'Complete User' },
			$hash: 'complete-hash',
			$timestamp: '2024-01-01T00:05:00Z',
			$timestamps: { id: '2024-01-01T00:05:00Z', name: '2024-01-01T00:05:00Z' },
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
				users: typeof testUserSchema;
			};
		}>;
		let dbName: string;

		beforeEach(async () => {
			dbName = `test-db-${Date.now()}-${Math.random()}`;
			const config = {
				name: dbName,
				version: 1 as const,
				stores: {
					users: testUserSchema,
				},
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
				$timestamp: '2024-01-01T00:00:00Z',
				$timestamps: {
					id: '2024-01-01T00:00:00Z',
					name: '2024-01-01T00:00:00Z',
				},
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
			await expect(
				// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
				getDocument(db, 'nonexistent-store' as any, 'user-1'),
			).rejects.toThrow();
		});
	});
});
describe('putDocument', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof testUserSchema;
		};
	}>;
	let dbName: string;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: testUserSchema,
			},
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
			$timestamp: '2024-01-01T00:10:00Z',
			$timestamps: { id: '2024-01-01T00:10:00Z', name: '2024-01-01T00:10:00Z' },
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
			$timestamp: '2024-01-01T00:11:00Z',
			$timestamps: { id: '2024-01-01T00:11:00Z', name: '2024-01-01T00:11:00Z' },
		};
		await putDocument(db, 'users', doc);

		const updatedDoc: Document<{ id: string; name: string }> = {
			...doc,
			$data: { id: 'put-user-2', name: 'Updated Name' },
			$hash: 'put-hash-2b',
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
			$timestamp: '2024-01-01T00:12:00Z',
			$timestamps: { id: '2024-01-01T00:12:00Z', name: '2024-01-01T00:12:00Z' },
		};
		await expect(
			// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
			putDocument(db, 'nonexistent-store' as any, doc),
		).rejects.toThrow();
	});
});
describe('getAllDocuments', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof testUserSchema;
		};
	}>;
	let dbName: string;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: testUserSchema,
			},
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
				$timestamp: '2024-01-01T00:00:00Z',
				$timestamps: {
					id: '2024-01-01T00:00:00Z',
					name: '2024-01-01T00:00:00Z',
				},
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamp: '2024-01-01T00:01:00Z',
				$timestamps: {
					id: '2024-01-01T00:01:00Z',
					name: '2024-01-01T00:01:00Z',
				},
			},
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
		await expect(
			// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
			getAllDocuments(db, 'nonexistent-store' as any),
		).rejects.toThrow();
	});
});
describe('addDocuments', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof testUserSchema;
		};
	}>;
	let dbName: string;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: testUserSchema,
			},
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
				$timestamp: '2024-01-01T00:00:00Z',
				$timestamps: {
					id: '2024-01-01T00:00:00Z',
					name: '2024-01-01T00:00:00Z',
				},
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamp: '2024-01-01T00:01:00Z',
				$timestamps: {
					id: '2024-01-01T00:01:00Z',
					name: '2024-01-01T00:01:00Z',
				},
			},
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
				$timestamp: '2024-01-01T00:00:00Z',
				$timestamps: {
					id: '2024-01-01T00:00:00Z',
					name: '2024-01-01T00:00:00Z',
				},
			},
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Duplicate' },
				$hash: 'hash-dup',
				$timestamp: '2024-01-01T00:02:00Z',
				$timestamps: {
					id: '2024-01-01T00:02:00Z',
					name: '2024-01-01T00:02:00Z',
				},
			},
		];
		await expect(addDocuments(db, 'users', docs)).rejects.toThrow();
	});
});

describe('putDocuments', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof testUserSchema;
		};
	}>;
	let dbName: string;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: testUserSchema,
			},
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
				$timestamp: '2024-01-01T00:00:00Z',
				$timestamps: {
					id: '2024-01-01T00:00:00Z',
					name: '2024-01-01T00:00:00Z',
				},
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamp: '2024-01-01T00:01:00Z',
				$timestamps: {
					id: '2024-01-01T00:01:00Z',
					name: '2024-01-01T00:01:00Z',
				},
			},
		];
		await expect(putDocuments(db, 'users', docs)).resolves.toBeUndefined();
		const allDocs = await getAllDocuments(db, 'users');
		expect(allDocs).toHaveLength(2);
		expect(allDocs).toEqual(expect.arrayContaining(docs));

		// Update one document
		const updatedDocs = [
			{
				...docs[0],
				$data: { id: 'user-1', name: 'Alice Updated' },
				$hash: 'hash-1b',
			},
			{
				...docs[1],
				$data: { id: 'user-2', name: 'Bob Updated' },
				$hash: 'hash-2b',
			},
		];
		await expect(
			putDocuments(db, 'users', updatedDocs),
		).resolves.toBeUndefined();
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
				$timestamp: '2024-01-01T00:00:00Z',
				$timestamps: {
					id: '2024-01-01T00:00:00Z',
					name: '2024-01-01T00:00:00Z',
				},
			},
		];

		await expect(
			// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
			putDocuments(db, 'nonexistent-store' as any, docs),
		).rejects.toThrow();
	});
});
describe('queryDocuments', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof testUserSchema;
		};
	}>;
	let dbName: string;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: testUserSchema,
			},
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
				$timestamp: '2024-01-01T00:00:00Z',
				$timestamps: {
					id: '2024-01-01T00:00:00Z',
					name: '2024-01-01T00:00:00Z',
				},
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamp: '2024-01-01T00:01:00Z',
				$timestamps: {
					id: '2024-01-01T00:01:00Z',
					name: '2024-01-01T00:01:00Z',
				},
			},
			{
				$id: 'user-3',
				$data: { id: 'user-3', name: 'Carol' },
				$hash: 'hash-3',
				$timestamp: '2024-01-01T00:02:00Z',
				$timestamps: {
					id: '2024-01-01T00:02:00Z',
					name: '2024-01-01T00:02:00Z',
				},
			},
		];
		await addDocuments(db, 'users', docs);
		const result = await queryDocuments(db, 'users', (data) =>
			data.name.startsWith('A'),
		);
		expect(result).toHaveLength(1);
		expect(result[0].$data.name).toBe('Alice');
	});

	it('should return an empty array if no documents match', async () => {
		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamp: '2024-01-01T00:00:00Z',
				$timestamps: {
					id: '2024-01-01T00:00:00Z',
					name: '2024-01-01T00:00:00Z',
				},
			},
		];
		await addDocuments(db, 'users', docs);
		const result = await queryDocuments(
			db,
			'users',
			(data) => data.name === 'Nonexistent',
		);
		expect(result).toEqual([]);
	});

	it('should reject if the store does not exist', async () => {
		const predicate = () => true;
		await expect(
			// biome-ignore lint/suspicious/noExplicitAny: Intentionally using any to test error handling
			queryDocuments(db, 'nonexistent-store' as any, predicate),
		).rejects.toThrow();
	});
});

describe('HLC operations', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof testUserSchema;
		};
	}>;
	let dbName: string;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: testUserSchema,
			},
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

	describe('putHLC and getHLC', () => {
		it('should store and retrieve HLC timestamp for a store', async () => {
			const timestamp = '2024-01-01T00:00:00.000Z';

			await expect(putHLC(db, 'users', timestamp)).resolves.toBeUndefined();

			const retrieved = await getHLC(db, 'users');
			expect(retrieved).toBe(timestamp);
		});

		it('should return null if no HLC timestamp exists for a store', async () => {
			const result = await getHLC(db, 'users');
			expect(result).toBeNull();
		});

		it('should update existing HLC timestamp', async () => {
			const initialTimestamp = '2024-01-01T00:00:00.000Z';
			const updatedTimestamp = '2024-01-01T00:01:00.000Z';

			await putHLC(db, 'users', initialTimestamp);
			await putHLC(db, 'users', updatedTimestamp);

			const result = await getHLC(db, 'users');
			expect(result).toBe(updatedTimestamp);
		});

		it('should handle multiple stores independently', async () => {
			// Create a second store for testing
			const dbName2 = `test-db-${Date.now()}-${Math.random()}`;
			const config2 = {
				name: dbName2,
				version: 1 as const,
				stores: {
					users: testUserSchema,
					posts: testPostSchema,
				},
			};
			const db2 = await openDatabase(config2);

			try {
				const timestamp1 = '2024-01-01T00:00:00.000Z';
				const timestamp2 = '2024-01-01T00:01:00.000Z';

				await putHLC(db2, 'users', timestamp1);
				await putHLC(db2, 'posts', timestamp2);

				const result1 = await getHLC(db2, 'users');
				const result2 = await getHLC(db2, 'posts');

				expect(result1).toBe(timestamp1);
				expect(result2).toBe(timestamp2);
			} finally {
				db2.close();
				const deleteRequest = indexedDB.deleteDatabase(dbName2);
				await new Promise<void>((resolve) => {
					deleteRequest.onsuccess = () => resolve();
					deleteRequest.onerror = () => resolve();
				});
			}
		});
	});
});

describe('mergeDocuments', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof testUserSchema;
		};
	}>;
	let dbName: string;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: testUserSchema,
			},
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

	it('should merge new documents when no existing documents exist', async () => {
		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamp: '2024-01-01T00:00:00.000Z-000000-a',
				$timestamps: {
					id: '2024-01-01T00:00:00.000Z-000000-a',
					name: '2024-01-01T00:00:00.000Z-000000-a',
				},
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamp: '2024-01-01T00:01:00.000Z-000000-b',
				$timestamps: {
					id: '2024-01-01T00:01:00.000Z-000000-b',
					name: '2024-01-01T00:01:00.000Z-000000-b',
				},
			},
		];

		await mergeDocuments(db, 'users', docs);

		const allDocs = await getAllDocuments(db, 'users');
		expect(allDocs).toHaveLength(2);
		expect(allDocs[0].$data.name).toBe('Alice');
		expect(allDocs[1].$data.name).toBe('Bob');
	});

	it('should merge documents with existing documents using CRDT logic', async () => {
		// Add initial document
		const initialDoc: Document<{ id: string; name: string; age?: number }> = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Alice', age: 30 },
			$hash: 'initial-hash',
			$timestamp: '2024-01-01T00:00:00.000Z-000000-a',
			$timestamps: {
				id: '2024-01-01T00:00:00.000Z-000000-a',
				name: '2024-01-01T00:00:00.000Z-000000-a',
				age: '2024-01-01T00:00:00.000Z-000000-a',
			},
		};
		// biome-ignore lint/suspicious/noExplicitAny: Test needs to add extra field not in schema
		await addDocument(db, 'users', initialDoc as any);

		// Merge document with newer name, older age
		const mergeDoc: Document<{ id: string; name: string; age?: number }> = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Alicia', age: 25 },
			$hash: 'merge-hash',
			$timestamp: '2024-01-01T00:01:00.000Z-000000-b',
			$timestamps: {
				id: '2024-01-01T00:00:00.000Z-000000-a',
				name: '2024-01-01T00:01:00.000Z-000000-b',
				age: '2023-12-31T23:59:00.000Z-000000-z',
			},
		};

		// biome-ignore lint/suspicious/noExplicitAny: Test needs to merge extra field not in schema
		await mergeDocuments(db, 'users', [mergeDoc as any]);

		const result = await getDocument(db, 'users', 'user-1');
		expect(result).not.toBeNull();
		expect(result?.$data.name).toBe('Alicia'); // Newer timestamp
		// biome-ignore lint/suspicious/noExplicitAny: Test needs to access extra field not in schema
		expect((result?.$data as any).age).toBe(30); // Older timestamp, should keep original
		expect(result?.$timestamp).toBe('2024-01-01T00:01:00.000Z-000000-b');
	});

	it('should handle empty document array', async () => {
		await expect(mergeDocuments(db, 'users', [])).resolves.toBeUndefined();

		const allDocs = await getAllDocuments(db, 'users');
		expect(allDocs).toHaveLength(0);
	});

	it('should merge multiple documents with mixed existing/new scenario', async () => {
		// Add one existing document
		const existingDoc: Document<{ id: string; name: string }> = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Alice' },
			$hash: 'existing-hash',
			$timestamp: '2024-01-01T00:00:00.000Z-000000-a',
			$timestamps: {
				id: '2024-01-01T00:00:00.000Z-000000-a',
				name: '2024-01-01T00:00:00.000Z-000000-a',
			},
		};
		await addDocument(db, 'users', existingDoc);

		// Merge with update to existing + new document
		const mergeDocs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alicia' },
				$hash: 'updated-hash',
				$timestamp: '2024-01-01T00:01:00.000Z-000000-b',
				$timestamps: {
					id: '2024-01-01T00:00:00.000Z-000000-a',
					name: '2024-01-01T00:01:00.000Z-000000-b',
				},
			},
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'new-hash',
				$timestamp: '2024-01-01T00:02:00.000Z-000000-c',
				$timestamps: {
					id: '2024-01-01T00:02:00.000Z-000000-c',
					name: '2024-01-01T00:02:00.000Z-000000-c',
				},
			},
		];

		await mergeDocuments(db, 'users', mergeDocs);

		const allDocs = await getAllDocuments(db, 'users');
		expect(allDocs).toHaveLength(2);
		
		const user1 = allDocs.find(doc => doc.$id === 'user-1');
		const user2 = allDocs.find(doc => doc.$id === 'user-2');
		
		expect(user1?.$data.name).toBe('Alicia');
		expect(user2?.$data.name).toBe('Bob');
	});

	it('should handle concurrent merges properly', async () => {
		const docs1: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamp: '2024-01-01T00:00:00.000Z-000000-a',
				$timestamps: {
					id: '2024-01-01T00:00:00.000Z-000000-a',
					name: '2024-01-01T00:00:00.000Z-000000-a',
				},
			},
		];

		const docs2: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-2',
				$data: { id: 'user-2', name: 'Bob' },
				$hash: 'hash-2',
				$timestamp: '2024-01-01T00:01:00.000Z-000000-b',
				$timestamps: {
					id: '2024-01-01T00:01:00.000Z-000000-b',
					name: '2024-01-01T00:01:00.000Z-000000-b',
				},
			},
		];

		// Run merges concurrently
		await Promise.all([
			mergeDocuments(db, 'users', docs1),
			mergeDocuments(db, 'users', docs2),
		]);

		const allDocs = await getAllDocuments(db, 'users');
		expect(allDocs).toHaveLength(2);
	});

	it('should reject on transaction errors', async () => {
		// Close the database to simulate an error condition
		db.close();

		const docs: Document<{ id: string; name: string }>[] = [
			{
				$id: 'user-1',
				$data: { id: 'user-1', name: 'Alice' },
				$hash: 'hash-1',
				$timestamp: '2024-01-01T00:00:00.000Z-000000-a',
				$timestamps: {
					id: '2024-01-01T00:00:00.000Z-000000-a',
					name: '2024-01-01T00:00:00.000Z-000000-a',
				},
			},
		];

		await expect(mergeDocuments(db, 'users', docs)).rejects.toThrow();
	});
});
