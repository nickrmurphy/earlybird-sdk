/// <reference types="@vitest/browser/providers/playwright" />

import type { StorageAdapter } from './types';

import { Directory, Filesystem } from '@capacitor/filesystem';
import { describe, expect, it } from 'vitest';
import { createCapacitorAdapter } from './capacitor-adapter';
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
	});
};

createStorageAdapterTests('Capacitor', () => {
	return createCapacitorAdapter('test', {
		fs: Filesystem,
		directory: Directory.Temporary,
	});
});

createStorageAdapterTests('Memory', () => {
	return createMemoryAdapter();
});
