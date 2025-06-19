/// <reference types="@vitest/browser/providers/playwright" />

import type { StorageAdapter } from './types';

import { Directory, Filesystem } from '@capacitor/filesystem';
import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createCapacitorAdapter } from './capacitor-adapter';
import { createIndexedDBAdapter } from './indexeddb-adapter';
import { createLibSQLAdapter } from './libsql-adapter';
import { createMemoryAdapter } from './memory-adapter';

export type AdapterFactory = () => StorageAdapter | Promise<StorageAdapter>;

export const createStorageAdapterTests = (
	name: string,
	createAdapter: AdapterFactory,
) => {
	describe(`${name} Storage Adapter`, () => {
		// Cleanup test files for Capacitor adapter after each test
		if (name === 'Capacitor') {
			afterEach(async () => {
				try {
					// Clean up any test files that might have been created
					const files = await Filesystem.readdir({
						path: '',
						directory: Directory.Temporary,
					});

					for (const file of files.files) {
						if (
							file.name.startsWith('test-') &&
							(file.name.endsWith('.json') || file.name.endsWith('.hlc.txt'))
						) {
							await Filesystem.deleteFile({
								path: file.name,
								directory: Directory.Temporary,
							});
						}
					}
				} catch (error) {
					// Ignore cleanup errors - files might not exist
				}
			});
		}
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

createStorageAdapterTests('Capacitor', () => {
	const uniqueCollection = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	return createCapacitorAdapter(uniqueCollection, {
		fs: Filesystem,
		directory: Directory.Temporary,
	});
});

createStorageAdapterTests('Memory', () => {
	return createMemoryAdapter();
});

// LibSQL adapter tests are skipped in browser environments
// since LibSQL client has limited browser support
if (typeof window === 'undefined') {
	createStorageAdapterTests('LibSQL', () => {
		const uniqueCollection = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const client = createClient({
			url: ':memory:',
		});

		return createLibSQLAdapter(uniqueCollection, {
			client,
			tablePrefix: 'test_store',
		});
	});
}

createStorageAdapterTests('IndexedDB', () => {
	const uniqueCollection = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	return createIndexedDBAdapter(uniqueCollection, {
		databaseName: `test_db_${Date.now()}`,
	});
});
