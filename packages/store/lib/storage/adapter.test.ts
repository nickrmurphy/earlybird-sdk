/// <reference types="@vitest/browser/providers/playwright" />

import type { StorageAdapter } from './types';

import { afterEach, describe, expect, it } from 'vitest';
import { createIndexedDBAdapter } from './indexeddb-adapter';
import { createMemoryAdapter } from './memory-adapter';

export type AdapterFactory = () => StorageAdapter | Promise<StorageAdapter>;

export const createStorageAdapterTests = (
	name: string,
	createAdapter: AdapterFactory,
) => {
	describe(`${name} Storage Adapter`, () => {
		describe('loadData and saveData', () => {
			it('returns null when file does not exist', async () => {
				const adapter = await createAdapter();
				const result = await adapter.loadData();

				expect(result).toBeNull();
			});

			it('writes and returns file content when file exists', async () => {
				const adapter = await createAdapter();
				await adapter.saveData('{"test": "data"}');
				const result = await adapter.loadData();

				expect(result).toBe('{"test": "data"}');
			});

			it('overwrites existing data', async () => {
				const adapter = await createAdapter();
				await adapter.saveData('{"initial": "data"}');
				await adapter.saveData('{"updated": "data"}');
				const result = await adapter.loadData();

				expect(result).toBe('{"updated": "data"}');
			});
		});

		describe('loadHLC and saveHLC', () => {
			it('returns null when HLC file does not exist', async () => {
				const adapter = await createAdapter();
				const result = await adapter.loadHLC();

				expect(result).toBeNull();
			});

			it('saves and loads HLC content', async () => {
				const adapter = await createAdapter();
				await adapter.saveHLC('hlc-data');
				const result = await adapter.loadHLC();

				expect(result).toBe('hlc-data');
			});

			it('overwrites existing HLC data', async () => {
				const adapter = await createAdapter();
				await adapter.saveHLC('initial-hlc');
				await adapter.saveHLC('updated-hlc');
				const result = await adapter.loadHLC();

				expect(result).toBe('updated-hlc');
			});
		});

		describe('data and HLC isolation', () => {
			it('keeps data and HLC separate', async () => {
				const adapter = await createAdapter();
				await adapter.saveData('{"data": "content"}');
				await adapter.saveHLC('hlc-content');

				const dataResult = await adapter.loadData();
				const hlcResult = await adapter.loadHLC();

				expect(dataResult).toBe('{"data": "content"}');
				expect(hlcResult).toBe('hlc-content');
			});
		});

		describe('listener notifications', () => {
			it('notifies listeners when data is saved', async () => {
				const adapter = await createAdapter();
				let notificationCount = 0;

				const listener = () => {
					notificationCount++;
				};

				adapter.registerListener('test-listener', listener);
				await adapter.saveData('{"test": "data"}');

				expect(notificationCount).toBe(1);

				adapter.unregisterListener('test-listener');
			});

			it('does not notify unregistered listeners', async () => {
				const adapter = await createAdapter();
				let notificationCount = 0;

				const listener = () => {
					notificationCount++;
				};

				adapter.registerListener('test-listener', listener);
				adapter.unregisterListener('test-listener');
				await adapter.saveData('{"test": "data"}');

				expect(notificationCount).toBe(0);
			});
		});
	});
};

createStorageAdapterTests('Memory', () => {
	return createMemoryAdapter();
});


createStorageAdapterTests('IndexedDB', () => {
	const uniqueCollection = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	return createIndexedDBAdapter(uniqueCollection, {
		databaseName: `test_db_${Date.now()}`,
	});
});
