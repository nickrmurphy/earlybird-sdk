import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { openDatabase } from './operations';
import type { DatabaseConfig } from '../types';

const userSchema = z.object({
	id: z.string(),
	name: z.string()
});

const postSchema = z.object({
	id: z.string(),
	title: z.string()
});

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