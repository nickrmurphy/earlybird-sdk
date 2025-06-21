import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createClock } from '../crdt/hlc';
import type { EntitySchema, TypedDatabase } from '../types';
import { getDocument, openDatabase } from './operations';
import {
	createMany,
	createOne,
	getAll,
	getOne,
	getWhere,
	updateMany,
	updateOne,
} from './service';

const userSchema = z.object({
	id: z.string(),
	name: z.string(),
}) as EntitySchema<{ id: string; name: string }>;

describe('createOne', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof userSchema;
		};
	}>;
	let dbName: string;
	let hlc: ReturnType<typeof createClock>;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: userSchema,
			},
		};
		db = await openDatabase(config);
		hlc = createClock();
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
		const userData = {
			id: 'user-1',
			name: 'John Doe',
		};

		await createOne(db, 'users', userSchema, hlc, userData);

		const storedDoc = await getDocument(db, 'users', 'user-1');
		expect(storedDoc).not.toBeNull();
		expect(storedDoc?.$data).toEqual(userData);
	});
});

describe('createMany', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof userSchema;
		};
	}>;
	let dbName: string;
	let hlc: ReturnType<typeof createClock>;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: userSchema,
			},
		};
		db = await openDatabase(config);
		hlc = createClock();
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
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
			{ id: 'user-3', name: 'Bob Johnson' },
		];

		await createMany(db, 'users', userSchema, hlc, userData);

		for (const user of userData) {
			const storedDoc = await getDocument(db, 'users', user.id);
			expect(storedDoc).not.toBeNull();
			expect(storedDoc?.$data).toEqual(user);
		}
	});

	it('handles empty array gracefully', async () => {
		await createMany(db, 'users', userSchema, hlc, []);

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
				db,
				'users',
				userSchema,
				hlc,
				userData as { id: string; name?: string }[],
			),
		).rejects.toThrow();

		// Verify no documents were created
		for (const user of userData) {
			const storedDoc = await getDocument(db, 'users', user.id);
			expect(storedDoc).toBeNull();
		}
	});

	it('creates documents with proper timestamps', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];

		await createMany(db, 'users', userSchema, hlc, userData);

		const doc1 = await getDocument(db, 'users', 'user-1');
		const doc2 = await getDocument(db, 'users', 'user-2');

		expect(doc1?.$timestamps).toBeDefined();
		expect(doc2?.$timestamps).toBeDefined();
		expect(doc1?.$timestamps.id).toBeDefined();
		expect(doc2?.$timestamps.id).toBeDefined();
	});

	it('handles single item array', async () => {
		const userData = [{ id: 'user-1', name: 'John Doe' }];

		await createMany(db, 'users', userSchema, hlc, userData);

		const storedDoc = await getDocument(db, 'users', 'user-1');
		expect(storedDoc).not.toBeNull();
		expect(storedDoc?.$data).toEqual(userData[0]);
	});
});

describe('getOne', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof userSchema;
		};
	}>;
	let dbName: string;
	let hlc: ReturnType<typeof createClock>;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: userSchema,
			},
		};
		db = await openDatabase(config);
		hlc = createClock();
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
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(db, 'users', userSchema, hlc, userData);

		const result = await getOne(db, 'users', 'user-1');
		expect(result).toEqual(userData);
	});

	it('returns null for non-existent document', async () => {
		const result = await getOne(db, 'users', 'non-existent');
		expect(result).toBeNull();
	});
});

describe('getAll', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof userSchema;
		};
	}>;
	let dbName: string;
	let hlc: ReturnType<typeof createClock>;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: userSchema,
			},
		};
		db = await openDatabase(config);
		hlc = createClock();
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
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
			{ id: 'user-3', name: 'Bob Johnson' },
		];
		await createMany(db, 'users', userSchema, hlc, userData);

		const result = await getAll(db, 'users');
		expect(result).toHaveLength(3);
		expect(result).toEqual(expect.arrayContaining(userData));
	});

	it('returns empty array for empty store', async () => {
		const result = await getAll(db, 'users');
		expect(result).toEqual([]);
	});
});

describe('getWhere', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof userSchema;
		};
	}>;
	let dbName: string;
	let hlc: ReturnType<typeof createClock>;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: userSchema,
			},
		};
		db = await openDatabase(config);
		hlc = createClock();
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
		await createMany(db, 'users', userSchema, hlc, userData);

		const result = await getWhere(db, 'users', (user) =>
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
		await createMany(db, 'users', userSchema, hlc, userData);

		const result = await getWhere(db, 'users', (user) =>
			user.name.startsWith('Bob'),
		);
		expect(result).toEqual([]);
	});

	it('returns empty array for empty store', async () => {
		const result = await getWhere(db, 'users', (user) =>
			user.name.startsWith('John'),
		);
		expect(result).toEqual([]);
	});
});

describe('updateOne', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof userSchema;
		};
	}>;
	let dbName: string;
	let hlc: ReturnType<typeof createClock>;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: userSchema,
			},
		};
		db = await openDatabase(config);
		hlc = createClock();
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
		await createOne(db, 'users', userSchema, hlc, userData);

		await updateOne(db, 'users', userSchema, hlc, 'user-1', {
			name: 'Jane Doe',
		});

		const updatedUser = await getOne(db, 'users', 'user-1');
		expect(updatedUser).toEqual({ id: 'user-1', name: 'Jane Doe' });
	});

	it('preserves unchanged fields when updating', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(db, 'users', userSchema, hlc, userData);

		await updateOne(db, 'users', userSchema, hlc, 'user-1', {
			name: 'Jane Doe',
		});

		const updatedUser = await getOne(db, 'users', 'user-1');
		expect(updatedUser?.id).toBe('user-1');
		expect(updatedUser?.name).toBe('Jane Doe');
	});

	it('throws error for non-existent document', async () => {
		await expect(
			updateOne(db, 'users', userSchema, hlc, 'non-existent', {
				name: 'Jane Doe',
			}),
		).rejects.toThrow(
			'Document with ID non-existent does not exist in store users',
		);
	});

	it('validates merged data', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(db, 'users', userSchema, hlc, userData);

		await expect(
			updateOne(db, 'users', userSchema, hlc, 'user-1', {
				name: 123 as unknown as string,
			}),
		).rejects.toThrow();
	});

	it('updates document timestamps', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(db, 'users', userSchema, hlc, userData);

		const originalDoc = await getDocument(db, 'users', 'user-1');
		const originalTimestamp = originalDoc?.$timestamps;

		// Wait a bit to ensure timestamp difference
		await new Promise((resolve) => setTimeout(resolve, 1));

		await updateOne(db, 'users', userSchema, hlc, 'user-1', {
			name: 'Jane Doe',
		});

		const updatedDoc = await getDocument(db, 'users', 'user-1');
		expect(updatedDoc?.$timestamps).toBeDefined();
		expect(updatedDoc?.$timestamps).not.toEqual(originalTimestamp);
	});
});

describe('updateMany', () => {
	let db: TypedDatabase<{
		name: string;
		version: 1;
		stores: {
			users: typeof userSchema;
		};
	}>;
	let dbName: string;
	let hlc: ReturnType<typeof createClock>;

	beforeEach(async () => {
		dbName = `test-db-${Date.now()}-${Math.random()}`;
		const config = {
			name: dbName,
			version: 1 as const,
			stores: {
				users: userSchema,
			},
		};
		db = await openDatabase(config);
		hlc = createClock();
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
		await createMany(db, 'users', userSchema, hlc, userData);

		const updates = [
			{ id: 'user-1', data: { name: 'John Updated' } },
			{ id: 'user-3', data: { name: 'Bob Updated' } },
		];
		await updateMany(db, 'users', userSchema, hlc, updates);

		const user1 = await getOne(db, 'users', 'user-1');
		const user2 = await getOne(db, 'users', 'user-2');
		const user3 = await getOne(db, 'users', 'user-3');

		expect(user1).toEqual({ id: 'user-1', name: 'John Updated' });
		expect(user2).toEqual({ id: 'user-2', name: 'Jane Smith' }); // unchanged
		expect(user3).toEqual({ id: 'user-3', name: 'Bob Updated' });
	});

	it('fails fast when any document does not exist', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await createMany(db, 'users', userSchema, hlc, userData);

		const updates = [
			{ id: 'user-1', data: { name: 'John Updated' } },
			{ id: 'non-existent', data: { name: 'Should Fail' } },
			{ id: 'user-2', data: { name: 'Jane Updated' } },
		];

		await expect(
			updateMany(db, 'users', userSchema, hlc, updates),
		).rejects.toThrow(
			'Document with ID non-existent does not exist in store users',
		);

		// Verify no documents were updated
		const user1 = await getOne(db, 'users', 'user-1');
		const user2 = await getOne(db, 'users', 'user-2');
		expect(user1).toEqual({ id: 'user-1', name: 'John Doe' });
		expect(user2).toEqual({ id: 'user-2', name: 'Jane Smith' });
	});

	it('handles empty updates array', async () => {
		await updateMany(db, 'users', userSchema, hlc, []);
		// Should not throw and should complete successfully
	});

	it('handles single document update', async () => {
		const userData = { id: 'user-1', name: 'John Doe' };
		await createOne(db, 'users', userSchema, hlc, userData);

		await updateMany(db, 'users', userSchema, hlc, [
			{ id: 'user-1', data: { name: 'John Updated' } },
		]);

		const updatedUser = await getOne(db, 'users', 'user-1');
		expect(updatedUser).toEqual({ id: 'user-1', name: 'John Updated' });
	});

	it('validates all merged data', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await createMany(db, 'users', userSchema, hlc, userData);

		const updates = [
			{ id: 'user-1', data: { name: 'John Updated' } },
			{ id: 'user-2', data: { name: 123 as unknown as string } }, // Invalid
		];

		await expect(
			updateMany(db, 'users', userSchema, hlc, updates),
		).rejects.toThrow();

		// Verify no documents were updated
		const user1 = await getOne(db, 'users', 'user-1');
		const user2 = await getOne(db, 'users', 'user-2');
		expect(user1).toEqual({ id: 'user-1', name: 'John Doe' });
		expect(user2).toEqual({ id: 'user-2', name: 'Jane Smith' });
	});

	it('updates document timestamps for all updated documents', async () => {
		const userData = [
			{ id: 'user-1', name: 'John Doe' },
			{ id: 'user-2', name: 'Jane Smith' },
		];
		await createMany(db, 'users', userSchema, hlc, userData);

		const originalDoc1 = await getDocument(db, 'users', 'user-1');
		const originalDoc2 = await getDocument(db, 'users', 'user-2');

		// Wait a bit to ensure timestamp difference
		await new Promise((resolve) => setTimeout(resolve, 1));

		const updates = [
			{ id: 'user-1', data: { name: 'John Updated' } },
			{ id: 'user-2', data: { name: 'Jane Updated' } },
		];
		await updateMany(db, 'users', userSchema, hlc, updates);

		const updatedDoc1 = await getDocument(db, 'users', 'user-1');
		const updatedDoc2 = await getDocument(db, 'users', 'user-2');

		expect(updatedDoc1?.$timestamps).toBeDefined();
		expect(updatedDoc2?.$timestamps).toBeDefined();
		expect(updatedDoc1?.$timestamps).not.toEqual(originalDoc1?.$timestamps);
		expect(updatedDoc2?.$timestamps).not.toEqual(originalDoc2?.$timestamps);
	});
});
