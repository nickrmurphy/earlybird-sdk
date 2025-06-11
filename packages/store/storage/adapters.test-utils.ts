import { rmSync } from 'node:fs';
import { afterEach, describe, expect, test } from 'vitest';
import type { StorageAdapter } from './types';

export const createStorageAdapterTests = (
	name: string,
	adapter: StorageAdapter,
) => {
	describe(`${name} Storage Adapter`, () => {
		afterEach(() => {
			// Clean up test files for node adapter
			if (name === 'NodeFS') {
				try {
					rmSync('content.txt', { force: true });
					rmSync('nested', { recursive: true, force: true });
					rmSync('empty', { recursive: true, force: true });
				} catch {
					// Ignore cleanup errors
				}
			}
		});
		test('writes and reads a file', async () => {
			const content = 'Hello, World!';
			await adapter.write('content.txt', content);
			const readContent = await adapter.read('content.txt');
			expect(readContent).toBe(content);
		});

		test('reads a non-existent file', async () => {
			const readContent = await adapter.read('non-existent.txt');
			expect(readContent).toBe(null);
		});

		test('overwrites a file', async () => {
			const content = 'Hello, World!';
			await adapter.write('content.txt', content);
			await adapter.write('content.txt', 'Goodbye, World!');
			const readContent = await adapter.read('content.txt');
			expect(readContent).toBe('Goodbye, World!');
		});

		test('writes to a nested directory', async () => {
			await adapter.write('nested/content.txt', 'Hello, World!');
			const readContent = await adapter.read('nested/content.txt');
			expect(readContent).toBe('Hello, World!');
		});

		test('lists files in a directory in sorted order', async () => {
			await adapter.write('nested/content.txt', 'Hello, World!');
			await adapter.write('nested/another.txt', 'Goodbye, World!');
			const files = await adapter.list('nested');
			expect(files).toEqual(['another.txt', 'content.txt']);
		});

		test('lists files in an empty or non-existent directory', async () => {
			const files = await adapter.list('empty');
			expect(files).toEqual([]);
		});
	});
};
