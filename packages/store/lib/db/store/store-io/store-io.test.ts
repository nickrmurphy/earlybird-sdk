import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { StoreIOContext } from './store-io';
import {
	add,
	addAll,
	get,
	getAll,
	put,
	putAll,
	putWithKey,
	query,
} from './store-io';
import { openDB } from '../../db-io';

interface TestItem {
	id: string;
	name: string;
}

describe('io operations', () => {
	let db: IDBDatabase;
	let dbName: string;
	let context: StoreIOContext;

	beforeEach(async () => {
		dbName = `test-io-db-${Date.now()}-${Math.random()}`;
		context = {
			db: await openTestDatabase(dbName),
			storeName: 'items',
		};
		db = context.db;
	});

	afterEach(async () => {
		db.close();
		const deleteRequest = indexedDB.deleteDatabase(dbName);
		await new Promise<void>((resolve) => {
			deleteRequest.onsuccess = () => resolve();
			deleteRequest.onerror = () => resolve();
		});
	});

	async function openTestDatabase(name: string): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(name, 1);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				db.createObjectStore('items', { keyPath: 'id' });
			};
		});
	}

	describe('get', () => {
		it('should retrieve a single item by key', async () => {
			const item: TestItem = { id: 'test-1', name: 'Test Item' };

			// Manually add item to test retrieval
			const transaction = db.transaction('items', 'readwrite');
			const store = transaction.objectStore('items');
			await new Promise<void>((resolve, reject) => {
				const request = store.add(item);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});

			const result = await get<TestItem>(context, 'test-1');
			expect(result).toEqual(item);
		});

		it('should return null if item does not exist', async () => {
			const result = await get<TestItem>(context, 'nonexistent');
			expect(result).toBeNull();
		});

		it('should reject if store does not exist', async () => {
			const invalidContext: StoreIOContext = {
				db,
				storeName: 'nonexistent-store',
			};
			await expect(get<TestItem>(invalidContext, 'test-1')).rejects.toThrow();
		});
	});

	describe('getAll', () => {
		it('should retrieve all items from store', async () => {
			const items: TestItem[] = [
				{ id: 'item-1', name: 'First Item' },
				{ id: 'item-2', name: 'Second Item' },
			];

			// Manually add items
			const transaction = db.transaction('items', 'readwrite');
			const store = transaction.objectStore('items');
			for (const item of items) {
				await new Promise<void>((resolve, reject) => {
					const request = store.add(item);
					request.onsuccess = () => resolve();
					request.onerror = () => reject(request.error);
				});
			}

			const result = await getAll<TestItem>(context);
			expect(result).toHaveLength(2);
			expect(result).toEqual(expect.arrayContaining(items));
		});

		it('should return empty array if store is empty', async () => {
			const result = await getAll<TestItem>(context);
			expect(result).toEqual([]);
		});

		it('should reject if store does not exist', async () => {
			const invalidContext: StoreIOContext = {
				db,
				storeName: 'nonexistent-store',
			};
			await expect(getAll<TestItem>(invalidContext)).rejects.toThrow();
		});
	});

	describe('put', () => {
		it('should store a single item', async () => {
			const item: TestItem = { id: 'put-1', name: 'Put Item' };

			await expect(put(context, item)).resolves.toBeUndefined();

			const stored = await get<TestItem>(context, 'put-1');
			expect(stored).toEqual(item);
		});

		it('should update an existing item', async () => {
			const item: TestItem = { id: 'put-2', name: 'Original' };
			const updatedItem: TestItem = { id: 'put-2', name: 'Updated' };

			await put(context, item);
			await put(context, updatedItem);

			const stored = await get<TestItem>(context, 'put-2');
			expect(stored).toEqual(updatedItem);
		});

		it('should reject if store does not exist', async () => {
			const item: TestItem = { id: 'put-3', name: 'No Store' };
			const invalidContext: StoreIOContext = {
				db,
				storeName: 'nonexistent-store',
			};
			await expect(put(invalidContext, item)).rejects.toThrow();
		});
	});

	describe('putAll', () => {
		it('should store multiple items', async () => {
			const items: TestItem[] = [
				{ id: 'put-all-1', name: 'First' },
				{ id: 'put-all-2', name: 'Second' },
			];

			await expect(putAll(context, items)).resolves.toBeUndefined();

			const allItems = await getAll<TestItem>(context);
			expect(allItems).toHaveLength(2);
			expect(allItems).toEqual(expect.arrayContaining(items));
		});

		it('should update existing items', async () => {
			const initialItems: TestItem[] = [
				{ id: 'put-all-3', name: 'Original First' },
				{ id: 'put-all-4', name: 'Original Second' },
			];
			const updatedItems: TestItem[] = [
				{ id: 'put-all-3', name: 'Updated First' },
				{ id: 'put-all-4', name: 'Updated Second' },
			];

			await putAll(context, initialItems);
			await putAll(context, updatedItems);

			const allItems = await getAll<TestItem>(context);
			expect(allItems).toHaveLength(2);
			expect(allItems).toEqual(expect.arrayContaining(updatedItems));
		});

		it('should reject if store does not exist', async () => {
			const items: TestItem[] = [{ id: 'put-all-5', name: 'No Store' }];
			const invalidContext: StoreIOContext = {
				db,
				storeName: 'nonexistent-store',
			};
			await expect(putAll(invalidContext, items)).rejects.toThrow();
		});
	});

	describe('add', () => {
		it('should add a single item', async () => {
			const item: TestItem = { id: 'add-1', name: 'Add Item' };

			await expect(add(context, item)).resolves.toBeUndefined();

			const stored = await get<TestItem>(context, 'add-1');
			expect(stored).toEqual(item);
		});

		it('should reject when adding duplicate item', async () => {
			const item: TestItem = { id: 'add-2', name: 'Duplicate' };
			const duplicate: TestItem = { id: 'add-2', name: 'Duplicate Again' };

			await add(context, item);
			await expect(add(context, duplicate)).rejects.toThrow();
		});

		it('should reject if store does not exist', async () => {
			const item: TestItem = { id: 'add-3', name: 'No Store' };
			const invalidContext: StoreIOContext = {
				db,
				storeName: 'nonexistent-store',
			};
			await expect(add(invalidContext, item)).rejects.toThrow();
		});
	});

	describe('addAll', () => {
		it('should add multiple items', async () => {
			const items: TestItem[] = [
				{ id: 'add-all-1', name: 'First' },
				{ id: 'add-all-2', name: 'Second' },
			];

			await expect(addAll(context, items)).resolves.toBeUndefined();

			const allItems = await getAll<TestItem>(context);
			expect(allItems).toHaveLength(2);
			expect(allItems).toEqual(expect.arrayContaining(items));
		});

		it('should reject if any item is a duplicate', async () => {
			const firstItem: TestItem = { id: 'add-all-3', name: 'First' };
			const duplicateItems: TestItem[] = [
				{ id: 'add-all-3', name: 'Duplicate' },
				{ id: 'add-all-4', name: 'Second' },
			];

			await add(context, firstItem);
			await expect(addAll(context, duplicateItems)).rejects.toThrow();
		});

		it('should reject if store does not exist', async () => {
			const items: TestItem[] = [{ id: 'add-all-5', name: 'No Store' }];
			const invalidContext: StoreIOContext = {
				db,
				storeName: 'nonexistent-store',
			};
			await expect(addAll(invalidContext, items)).rejects.toThrow();
		});
	});

	describe('query', () => {
		it('should return items matching predicate', async () => {
			const items: TestItem[] = [
				{ id: 'query-1', name: 'Alice' },
				{ id: 'query-2', name: 'Bob' },
				{ id: 'query-3', name: 'Amanda' },
			];

			await addAll(context, items);

			const result = await query<TestItem>(context, (item) =>
				item.name.startsWith('A'),
			);
			expect(result).toHaveLength(2);
			expect(result.map((item) => item.name)).toEqual(
				expect.arrayContaining(['Alice', 'Amanda']),
			);
		});

		it('should return empty array if no items match', async () => {
			const items: TestItem[] = [
				{ id: 'query-4', name: 'Bob' },
				{ id: 'query-5', name: 'Carol' },
			];

			await addAll(context, items);

			const result = await query<TestItem>(context, (item) =>
				item.name.startsWith('Z'),
			);
			expect(result).toEqual([]);
		});

		it('should return empty array if store is empty', async () => {
			const result = await query<TestItem>(context, () => true);
			expect(result).toEqual([]);
		});

		it('should reject if store does not exist', async () => {
			const invalidContext: StoreIOContext = {
				db,
				storeName: 'nonexistent-store',
			};
			await expect(
				query<TestItem>(invalidContext, () => true),
			).rejects.toThrow();
		});
	});

	describe('putWithKey', () => {
		let keyValueContext: StoreIOContext;
		let keyValueDbName: string;

		beforeEach(async () => {
			keyValueDbName = `test-kv-db-${Date.now()}-${Math.random()}`;
			const db = await openDB(keyValueDbName, 1, (db) => {
				db.createObjectStore('keyvalue');
			});
			keyValueContext = {
				db,
				storeName: 'keyvalue',
			};
		});

		afterEach(async () => {
			keyValueContext.db.close();
			const deleteRequest = indexedDB.deleteDatabase(keyValueDbName);
			await new Promise<void>((resolve) => {
				deleteRequest.onsuccess = () => resolve();
				deleteRequest.onerror = () => resolve();
			});
		});

		it('should store and retrieve values with explicit keys', async () => {
			const value = 'test-timestamp-value';
			const key = 'test-key';

			await expect(
				putWithKey(keyValueContext, value, key),
			).resolves.toBeUndefined();

			const result = await get<string>(keyValueContext, key);
			expect(result).toBe(value);
		});

		it('should update existing values', async () => {
			const key = 'update-key';
			const originalValue = 'original';
			const updatedValue = 'updated';

			await putWithKey(keyValueContext, originalValue, key);
			await putWithKey(keyValueContext, updatedValue, key);

			const result = await get<string>(keyValueContext, key);
			expect(result).toBe(updatedValue);
		});

		it('should reject if store does not exist', async () => {
			const invalidContext: StoreIOContext = {
				db: keyValueContext.db,
				storeName: 'nonexistent-store',
			};
			await expect(
				putWithKey(invalidContext, 'value', 'key'),
			).rejects.toThrow();
			await expect(get<string>(invalidContext, 'key')).rejects.toThrow();
		});
	});
});
