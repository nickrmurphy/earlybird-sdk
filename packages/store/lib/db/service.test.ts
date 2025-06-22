import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HLC } from '../crdt/hlc';
import {
	createTestDatabaseConfig,
	createTestUser,
	createTestUsers,
	testUserSchema,
} from '../testing/factories';
import type { TypedDatabase } from '../types';
import { getDocument, openDatabase } from './operations';
import {
	create,
	createMany,
	createOne,
	getAll,
	getDocumentsInBuckets,
	getHashes,
	getOne,
	getWhere,
	merge,
	update,
	updateMany,
	updateOne,
} from './service';

describe('createOne', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('creates a document and stores it in the database', async () => {
		const userData = createTestUser();

		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const storedDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, userData.id);
		expect(storedDoc).not.toBeNull();
		expect(storedDoc?.$data).toEqual(userData);
	});
});

describe('createMany', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('creates multiple documents and stores them in the database', async () => {
		const userData = createTestUsers(3);

		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		for (const user of userData) {
			const storedDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, user.id);
			expect(storedDoc).not.toBeNull();
			expect(storedDoc?.$data).toEqual(user);
		}
	});

	it('handles empty array gracefully', async () => {
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			[],
		);

		const allUsers = await new Promise<unknown[]>((resolve) => {
			const transaction = db.transaction(['users'], 'readonly');
			const store = transaction.objectStore('users');
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result);
		});

		expect(allUsers).toHaveLength(0);
	});

	it('validates all items before creating any documents', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2' }, // Invalid: missing name
			{ id: 'user-3', name: 'Bob Johnson' },
		];

		await expect(
			createMany(
				{ db, storeName: 'users', schema: testUserSchema, hlc },
				userData as { id: string; name?: string }[],
			),
		).rejects.toThrow();

		// Verify no documents were created
		for (const user of userData) {
			const storedDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, user.id);
			expect(storedDoc).toBeNull();
		}
	});

	it('creates documents with proper timestamps', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];

		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const doc1 = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		const doc2 = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-2');

		expect(doc1?.$timestamps).toBeDefined();
		expect(doc2?.$timestamps).toBeDefined();
		expect(doc1?.$timestamps.id).toBeDefined();
		expect(doc2?.$timestamps.id).toBeDefined();
	});

	it('handles single item array', async () => {
		const userData = [{ id: 'user-1', name: 'John Doe' }];

		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const storedDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		expect(storedDoc).not.toBeNull();
		expect(storedDoc?.$data).toEqual(userData[0]);
	});
});

describe('getOne', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('retrieves a document by ID', async () => {
		const userData = createTestUser();
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getOne({ db, storeName: 'users' }, userData.id);
		expect(result).toEqual(userData);
	});

	it('returns null for non-existent document', async () => {
		const result = await getOne({ db, storeName: 'users' }, 'non-existent');
		expect(result).toBeNull();
	});
});

describe('getAll', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('retrieves all documents from store', async () => {
		const userData = createTestUsers(3);
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getAll({ db, storeName: 'users' });
		expect(result).toHaveLength(3);
		expect(result).toEqual(expect.arrayContaining(userData));
	});

	it('returns empty array for empty store', async () => {
		const result = await getAll({ db, storeName: 'users' });
		expect(result).toEqual([]);
	});
});

describe('getWhere', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('filters documents by predicate', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
			{ id: 'user-3', name: 'John Johnson' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getWhere({ db, storeName: 'users' }, (user) =>
			user.name.startsWith('John'),
		);
		expect(result).toHaveLength(2);
		expect(result).toEqual(
			expect.arrayContaining([
				{ id: 'user-1', name: 'John Doe' },
				{ id: 'user-3', name: 'John Johnson' },
			]),
		);
	});

	it('returns empty array when no documents match predicate', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getWhere({ db, storeName: 'users' }, (user) =>
			user.name.startsWith('Bob'),
		);
		expect(result).toEqual([]);
	});

	it('returns empty array for empty store', async () => {
		const result = await getWhere({ db, storeName: 'users' }, (user) =>
			user.name.startsWith('John'),
		);
		expect(result).toEqual([]);
	});
});

describe('updateOne', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('updates a document with partial data', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		await updateOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			'user-1',
			{
				name: 'Jane Doe',
			},
		);

		const updatedUser = await getOne({ db, storeName: 'users' }, 'user-1');
		expect(updatedUser).toEqual({ id: 'user-1', name: 'Jane Doe' });
	});

	it('preserves unchanged fields when updating', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		await updateOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			'user-1',
			{
				name: 'Jane Doe',
			},
		);

		const updatedUser = await getOne({ db, storeName: 'users' }, 'user-1');
		expect(updatedUser?.id).toBe('user-1');
		expect(updatedUser?.name).toBe('Jane Doe');
	});

	it('throws error for non-existent document', async () => {
		await expect(
			updateOne(
				{ db, storeName: 'users', schema: testUserSchema, hlc },
				'non-existent',
				{
					name: 'Jane Doe',
				},
			),
		).rejects.toThrow(
			'Document with ID non-existent does not exist in store users',
		);
	});

	it('validates merged data', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		await expect(
			updateOne(
				{ db, storeName: 'users', schema: testUserSchema, hlc },
				'user-1',
				{
					name: 123 as unknown as string,
				},
			),
		).rejects.toThrow();
	});

	it('updates document timestamps', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const originalDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		const originalTimestamp = originalDoc?.$timestamps;

		// Wait a bit to ensure timestamp difference
		await new Promise((resolve) => setTimeout(resolve, 1));

		await updateOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			'user-1',
			{
				name: 'Jane Doe',
			},
		);

		const updatedDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		expect(updatedDoc?.$timestamps).toBeDefined();
		expect(updatedDoc?.$timestamps).not.toEqual(originalTimestamp);
	});
});

describe('updateMany', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('updates multiple documents with partial data', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
			{ id: 'user-3', name: 'Bob Johnson' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const updates = [
			{ id: 'user-1', data: { name: 'John Updated' } },
			{ id: 'user-3', data: { name: 'Bob Updated' } },
		];
		await updateMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			updates,
		);

		const user1 = await getOne({ db, storeName: 'users' }, 'user-1');
		const user2 = await getOne({ db, storeName: 'users' }, 'user-2');
		const user3 = await getOne({ db, storeName: 'users' }, 'user-3');

		expect(user1).toEqual({ id: 'user-1', name: 'John Updated' });
		expect(user2).toEqual({ id: 'user-2', name: 'Jane Smith' }); // unchanged
		expect(user3).toEqual({ id: 'user-3', name: 'Bob Updated' });
	});

	it('fails fast when any document does not exist', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const updates = [
			{ id: 'user-1', data: { name: 'John Updated' } },
			{ id: 'non-existent', data: { name: 'Should Fail' } },
			{ id: 'user-2', data: { name: 'Jane Updated' } },
		];

		await expect(
			updateMany(
				{ db, storeName: 'users', schema: testUserSchema, hlc },
				updates,
			),
		).rejects.toThrow(
			'Document with ID non-existent does not exist in store users',
		);

		// Verify no documents were updated
		const user1 = await getOne({ db, storeName: 'users' }, 'user-1');
		const user2 = await getOne({ db, storeName: 'users' }, 'user-2');
		expect(user1).toEqual({ id: 'user-1', name: 'John Doe' });
		expect(user2).toEqual({ id: 'user-2', name: 'Jane Smith' });
	});

	it('handles empty updates array', async () => {
		await updateMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			[],
		);
		// Should not throw and should complete successfully
	});

	it('handles single document update', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		await updateMany({ db, storeName: 'users', schema: testUserSchema, hlc }, [
			{ id: 'user-1', data: { name: 'John Updated' } },
		]);

		const updatedUser = await getOne({ db, storeName: 'users' }, 'user-1');
		expect(updatedUser).toEqual({ id: 'user-1', name: 'John Updated' });
	});

	it('validates all merged data', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const updates = [
			{ id: 'user-1', data: { name: 'John Updated' } },
			{ id: 'user-2', data: { name: 123 as unknown as string } }, // Invalid
		];

		await expect(
			updateMany(
				{ db, storeName: 'users', schema: testUserSchema, hlc },
				updates,
			),
		).rejects.toThrow();

		// Verify no documents were updated
		const user1 = await getOne({ db, storeName: 'users' }, 'user-1');
		const user2 = await getOne({ db, storeName: 'users' }, 'user-2');
		expect(user1).toEqual({ id: 'user-1', name: 'John Doe' });
		expect(user2).toEqual({ id: 'user-2', name: 'Jane Smith' });
	});

	it('updates document timestamps for all updated documents', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const originalDoc1 = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		const originalDoc2 = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-2');

		// Wait a bit to ensure timestamp difference
		await new Promise((resolve) => setTimeout(resolve, 1));

		const updates = [
			{ id: 'user-1', data: { name: 'John Updated' } },
			{ id: 'user-2', data: { name: 'Jane Updated' } },
		];
		await updateMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			updates,
		);

		const updatedDoc1 = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		const updatedDoc2 = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-2');

		expect(updatedDoc1?.$timestamps).toBeDefined();
		expect(updatedDoc2?.$timestamps).toBeDefined();
		expect(updatedDoc1?.$timestamps).not.toEqual(originalDoc1?.$timestamps);
		expect(updatedDoc2?.$timestamps).not.toEqual(originalDoc2?.$timestamps);
	});
});

describe('getHashes', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('returns empty root hash and no buckets for empty store', async () => {
		const result = await getHashes({ db, storeName: 'users' });
		expect(result.root).toBeDefined();
		expect(typeof result.root).toBe('string');
		expect(result.buckets).toEqual({});
	});

	it('generates hashes for single document', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getHashes({ db, storeName: 'users' });
		expect(result.root).toBeDefined();
		expect(typeof result.root).toBe('string');
		expect(result.root.length).toBeGreaterThan(0);
		expect(result.buckets).toEqual({ 0: expect.any(String) });
	});

	it('generates different hashes for different documents', async () => {
		const userData1 = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData1,
		);
		const result1 = await getHashes({ db, storeName: 'users' });

		const userData2 = { id: 'user-2', name: 'Jane Smith' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData2,
		);
		const result2 = await getHashes({ db, storeName: 'users' });

		expect(result1.root).not.toEqual(result2.root);
	});

	it('creates multiple buckets with custom bucket size', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
			{ id: 'user-3', name: 'Bob Johnson' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getHashes({ db, storeName: 'users' }, 2);
		expect(Object.keys(result.buckets)).toHaveLength(2); // 3 documents with bucket size 2 = 2 buckets
		expect(result.buckets[0]).toBeDefined();
		expect(result.buckets[1]).toBeDefined();
	});

	it('orders documents by timestamp before hashing', async () => {
		// Create documents with some delay to ensure different timestamps
		const userData1 = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData1,
		);

		// Small delay to ensure different timestamps
		await new Promise((resolve) => setTimeout(resolve, 1));

		const userData2 = { id: 'user-2', name: 'Jane Smith' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData2,
		);

		const result = await getHashes({ db, storeName: 'users' });
		expect(result.root).toBeDefined();
		expect(typeof result.root).toBe('string');
		expect(result.root.length).toBeGreaterThan(0);
	});

	it('handles large bucket sizes gracefully', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getHashes({ db, storeName: 'users' }, 1000); // Bucket size larger than document count
		expect(Object.keys(result.buckets)).toHaveLength(1);
		expect(result.buckets[0]).toBeDefined();
	});
});

describe('getDocumentsInBuckets', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('returns empty array for empty store', async () => {
		const result = await getDocumentsInBuckets({ db, storeName: 'users' }, [0]);
		expect(result).toEqual([]);
	});

	it('returns documents from specific bucket', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
			{ id: 'user-3', name: 'Bob Johnson' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getDocumentsInBuckets(
			{ db, storeName: 'users' },
			[0],
			2,
		);
		expect(result).toHaveLength(2); // First bucket with bucket size 2
		expect(result[0].$data).toBeDefined();
		expect(result[1].$data).toBeDefined();
	});

	it('returns documents from multiple buckets', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
			{ id: 'user-3', name: 'Bob Johnson' },
			{ id: 'user-4', name: 'Alice Brown' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getDocumentsInBuckets(
			{ db, storeName: 'users' },
			[0, 1],
			2,
		);
		expect(result).toHaveLength(4); // Both buckets with bucket size 2
	});

	it('handles non-existent buckets gracefully', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getDocumentsInBuckets(
			{ db, storeName: 'users' },
			[5],
			2,
		); // Bucket 5 doesn't exist
		expect(result).toEqual([]);
	});

	it('returns documents sorted by timestamp', async () => {
		const userData1 = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData1,
		);

		// Small delay to ensure different timestamps
		await new Promise((resolve) => setTimeout(resolve, 1));

		const userData2 = { id: 'user-2', name: 'Jane Smith' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData2,
		);

		const result = await getDocumentsInBuckets(
			{ db, storeName: 'users' },
			[0],
			10,
		);
		expect(result).toHaveLength(2);

		// Verify they are sorted by timestamp (first document should have earlier timestamp)
		expect(result[0].$timestamp <= result[1].$timestamp).toBe(true);
	});

	it('handles custom bucket sizes', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
			{ id: 'user-3', name: 'Bob Johnson' },
		];
		await createMany(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getDocumentsInBuckets(
			{ db, storeName: 'users' },
			[0],
			1,
		);
		expect(result).toHaveLength(1); // Only first document with bucket size 1
	});

	it('returns correct document structure', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getDocumentsInBuckets({ db, storeName: 'users' }, [0]);
		expect(result).toHaveLength(1);
		expect(result[0]).toHaveProperty('$id');
		expect(result[0]).toHaveProperty('$data');
		expect(result[0]).toHaveProperty('$timestamp');
		expect(result[0]).toHaveProperty('$timestamps');
		expect(result[0]).toHaveProperty('$hash');
		expect(result[0].$data).toEqual(userData);
	});
});

describe('$timestamp functionality', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('sets $timestamp on document creation', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const doc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		expect(doc?.$timestamp).toBeDefined();
		expect(typeof doc?.$timestamp).toBe('string');
		expect(doc?.$timestamp.length).toBeGreaterThan(0);
	});

	it('updates $timestamp on document modification', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const originalDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		const originalTimestamp = originalDoc?.$timestamp;

		// Small delay to ensure different timestamps
		await new Promise((resolve) => setTimeout(resolve, 1));

		await updateOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			'user-1',
			{
				name: 'Jane Doe',
			},
		);

		const updatedDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		expect(updatedDoc?.$timestamp).toBeDefined();
		expect(updatedDoc?.$timestamp).not.toEqual(originalTimestamp);
	});

	it('$timestamp reflects latest mutation time', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const doc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		expect(doc?.$timestamp).toBeDefined();

		// The document timestamp should be a valid HLC timestamp
		expect(doc?.$timestamp).toMatch(/^\d+/); // Should start with digits (timestamp part)
	});
});

describe('create ergonomic function', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('handles single object', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };

		await create(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getOne({ db, storeName: 'users' }, 'user-1');
		expect(result).toEqual(userData);
	});

	it('handles array of objects', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];

		await create(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		const result = await getAll({ db, storeName: 'users' });
		expect(result).toHaveLength(2);
		expect(result).toEqual(expect.arrayContaining(userData));
	});
});

describe('update ergonomic function', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;
	let hlc: HLC;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
		hlc = new HLC();
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('handles single update', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await create(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		await update(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			{
				id: 'user-1',
				data: { name: 'Jane Doe' },
			},
		);

		const result = await getOne({ db, storeName: 'users' }, 'user-1');
		expect(result).toEqual({ id: 'user-1', name: 'Jane Doe' });
	});

	it('handles array of updates', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await create(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			userData,
		);

		await update({ db, storeName: 'users', schema: testUserSchema, hlc }, [
			{ id: 'user-1', data: { name: 'John Updated' } },
			{ id: 'user-2', data: { name: 'Jane Updated' } },
		]);

		const result = await getAll({ db, storeName: 'users' });
		expect(result).toEqual(
			expect.arrayContaining([
				{ id: 'user-1', name: 'John Updated' },
				{ id: 'user-2', name: 'Jane Updated' },
			]),
		);
	});
});

describe('merge', () => {
	let db: TypedDatabase<ReturnType<typeof createTestDatabaseConfig>>;
	let dbName: string;

	beforeEach(async () => {
		const config = createTestDatabaseConfig();
		dbName = config.name;
		db = await openDatabase(config, 'hlc');
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	it('merges documents with CRDT conflict resolution', async () => {
		// Add initial document
		const hlc = new HLC();
		const initialUser = createTestUser({ id: 'user-1', name: 'Alice' });
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			initialUser,
		);

		// Get the existing document to use its timestamps as baseline
		const existingDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		expect(existingDoc).not.toBeNull();

		// Wait a bit to ensure future timestamps
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Create a future timestamp that's definitely newer than existing
		const futureTimestamp =
			new Date(Date.now() + 1000 * 60 * 60).toISOString() + '-000000-z'; // 1 hour in future
		const pastTimestamp = '2020-01-01T00:00:00.000Z-000000-a'; // Definitely in the past

		// Create document to merge with newer name timestamp but older id timestamp
		const mergeDoc = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Alicia' },
			$hash: 'merge-hash',
			$timestamp: futureTimestamp,
			$timestamps: {
				id: pastTimestamp, // Much older than existing
				name: futureTimestamp, // Much newer than existing
			},
		};

		await merge({ db, storeName: 'users' }, [mergeDoc]);

		const result = await getOne({ db, storeName: 'users' }, 'user-1');
		expect(result).not.toBeNull();
		expect(result?.name).toBe('Alicia'); // Should be updated (newer timestamp)
		expect(result?.id).toBe('user-1'); // Should remain the same (older timestamp in merge doc)
	});

	it('handles empty document array', async () => {
		await expect(
			merge({ db, storeName: 'users' }, []),
		).resolves.toBeUndefined();

		const result = await getAll({ db, storeName: 'users' });
		expect(result).toEqual([]);
	});

	it('merges multiple documents in single operation', async () => {
		const docs = [
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

		await merge({ db, storeName: 'users' }, docs);

		const result = await getAll({ db, storeName: 'users' });
		expect(result).toHaveLength(2);
		expect(result).toEqual(
			expect.arrayContaining([
				{ id: 'user-1', name: 'Alice' },
				{ id: 'user-2', name: 'Bob' },
			]),
		);
	});

	it('merges documents that do not exist in database', async () => {
		const newDoc = {
			$id: 'user-new',
			$data: { id: 'user-new', name: 'New User' },
			$hash: 'new-hash',
			$timestamp: '2024-01-01T00:00:00.000Z-000000-a',
			$timestamps: {
				id: '2024-01-01T00:00:00.000Z-000000-a',
				name: '2024-01-01T00:00:00.000Z-000000-a',
			},
		};

		await merge({ db, storeName: 'users' }, [newDoc]);

		const result = await getOne({ db, storeName: 'users' }, 'user-new');
		expect(result).toEqual({ id: 'user-new', name: 'New User' });
	});

	it('does not update when merge document has older timestamps', async () => {
		// Add initial document with newer timestamps
		const hlc = new HLC();
		const initialUser = createTestUser({ id: 'user-1', name: 'Alice' });
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			initialUser,
		);

		// Create document with older timestamps
		const olderDoc = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Old Name' },
			$hash: 'old-hash',
			$timestamp: '2020-01-01T00:00:00.000Z-000000-a',
			$timestamps: {
				id: '2020-01-01T00:00:00.000Z-000000-a',
				name: '2020-01-01T00:00:00.000Z-000000-a',
			},
		};

		await merge({ db, storeName: 'users' }, [olderDoc]);

		const result = await getOne({ db, storeName: 'users' }, 'user-1');
		expect(result).not.toBeNull();
		expect(result?.name).toBe('Alice'); // Should remain unchanged
	});

	it('handles mixed scenarios with some newer and some older fields', async () => {
		// Add initial document
		const hlc = new HLC();

		// Create initial user with specific timestamps
		const initialUserData = createTestUser({ id: 'user-1', name: 'Alice' });
		await createOne(
			{ db, storeName: 'users', schema: testUserSchema, hlc },
			initialUserData,
		);

		// Get the created document to check its actual timestamps
		const existingDoc = await getDocument({ db, storeName: 'users', hlcStoreName: 'hlc' }, 'user-1');
		expect(existingDoc).not.toBeNull();

		// Wait a bit to ensure future timestamps
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Create a future timestamp that's definitely newer than existing
		const futureTimestamp =
			new Date(Date.now() + 1000 * 60 * 60).toISOString() + '-000000-z'; // 1 hour in future
		const pastTimestamp = '2020-01-01T00:00:00.000Z-000000-a'; // Definitely in the past

		// Create merge document with mixed timestamps - some newer, some older
		const mergeDoc = {
			$id: 'user-1',
			$data: { id: 'user-1', name: 'Alicia Updated' },
			$hash: 'merge-hash',
			$timestamp: futureTimestamp,
			$timestamps: {
				id: pastTimestamp, // Much older than existing
				name: futureTimestamp, // Much newer than existing
			},
		};

		await merge({ db, storeName: 'users' }, [mergeDoc]);

		const result = await getOne({ db, storeName: 'users' }, 'user-1');
		expect(result).not.toBeNull();
		expect(result?.id).toBe('user-1'); // Should keep original (merge doc has older timestamp)
		expect(result?.name).toBe('Alicia Updated'); // Should be updated (merge doc has newer timestamp)
	});
});
