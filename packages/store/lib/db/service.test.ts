import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createClock } from '../crdt/hlc';
import type { EntitySchema, TypedDatabase } from '../types';
import { getDocument, openDatabase } from './operations';
import { createOne, createMany } from './service';

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
