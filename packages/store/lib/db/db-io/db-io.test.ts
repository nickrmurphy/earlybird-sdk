import { describe, expect, it } from 'vitest';
import { openDB } from './db-io';

describe('openDB', () => {
	it('should open database with custom upgrade callback', async () => {
		const testDbName = `test-opendb-${Date.now()}-${Math.random()}`;

		const db = await openDB(testDbName, 1, (db) => {
			db.createObjectStore('custom-store', { keyPath: 'id' });
		});

		expect(db.name).toBe(testDbName);
		expect(db.version).toBe(1);
		expect(db.objectStoreNames.contains('custom-store')).toBe(true);

		db.close();
		await new Promise<void>((resolve) => {
			const deleteRequest = indexedDB.deleteDatabase(testDbName);
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});
});
