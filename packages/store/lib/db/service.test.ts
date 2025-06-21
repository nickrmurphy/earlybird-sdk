import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { create } from './service';
import { openDatabase, getDocument } from './operations';
import { createClock } from '../crdt/hlc';
import type { DatabaseConfig, TypedDatabase, EntitySchema } from '../types';

const userSchema = z.object({
	id: z.string(),
	name: z.string()
}) as EntitySchema<{ id: string; name: string }>;

describe('create', () => {
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
				users: userSchema
			}
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
			name: 'John Doe'
		};

		await create(db, 'users', userSchema, hlc, userData);

		const storedDoc = await getDocument(db, 'users', 'user-1');
		expect(storedDoc).not.toBeNull();
		expect(storedDoc?.$data).toEqual(userData);
	});
});