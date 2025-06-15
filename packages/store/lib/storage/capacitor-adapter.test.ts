// @vitest-environment jsdom
import 'fake-indexeddb/auto'; // automatically sets globalThis.indexedDB etc.

import { Directory, Filesystem } from '@capacitor/filesystem';
import { describe, expect, it } from 'vitest';
import { createCapacitorAdapter } from './capacitor-adapter';

describe('CapacitorAdapter', () => {
	const config = {
		fs: Filesystem,
		directory: Directory.Data,
	};

	describe('loadData and saveData', () => {
		it('returns null when file does not exist', async () => {
			const adapter = createCapacitorAdapter('test', config);
			const result = await adapter.loadData();

			expect(result).toBeNull();
		});

		it('writes and returns file content when file exists', async () => {
			const adapter = createCapacitorAdapter('test', config);
			await adapter.saveData('{"test": "data"}');
			const result = await adapter.loadData();

			expect(result).toBe('{"test": "data"}');
		});
	});

	describe('loadHLC', () => {
		it('returns null when HLC file does not exist', async () => {
			const adapter = createCapacitorAdapter('test', config);
			const result = await adapter.loadHLC();

			expect(result).toBeNull();
		});

		it('saves and loads HLC content', async () => {
			const adapter = createCapacitorAdapter('test', config);
			await adapter.saveHLC('hlc-data');
			const result = await adapter.loadHLC();

			expect(result).toBe('hlc-data');
		});
	});
});
