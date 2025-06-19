import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { createMemoryAdapter } from '../storage/memory-adapter';
import { createStore } from './store';

const todoSchema = z.object({
	title: z.string().min(2).max(100),
	completed: z.boolean().default(false),
});

describe('Store Integration Tests', () => {
	test('should synchronize two stores using hashes and document exchange', async () => {
		// Create Store A with initial documents
		const storeA = createStore('integration-test-a', {
			schema: todoSchema,
			adapter: createMemoryAdapter(),
		});

		await storeA.create('1', { title: 'Task A1', completed: false });
		await storeA.create('2', { title: 'Task A2', completed: true });

		// Create Store B with different documents
		const storeB = createStore('integration-test-b', {
			schema: todoSchema,
			adapter: createMemoryAdapter(),
		});

		await storeB.create('3', { title: 'Task B1', completed: false });
		await storeB.create('4', { title: 'Task B2', completed: true });

		// Get hashes from both stores
		const hashesA = await storeA.getHashes();
		const hashesB = await storeB.getHashes();

		// Verify stores have different hashes initially (both should have non-empty hashes)
		expect(hashesA.root).toBeTruthy();
		expect(hashesB.root).toBeTruthy();
		expect(hashesA.root).not.toBe(hashesB.root);

		// Get documents from Store A to merge into Store B
		const docsFromA = await storeA.getDocumentsByBucket([0]);
		expect(docsFromA).toHaveLength(2);

		// Get documents from Store B to merge into Store A
		const docsFromB = await storeB.getDocumentsByBucket([0]);
		expect(docsFromB).toHaveLength(2);

		// Convert document arrays to store format for merging
		const storeDataFromA = Object.fromEntries(
			docsFromA.map((doc, index) => [`${index + 1}`, doc]),
		);
		const storeDataFromB = Object.fromEntries(
			docsFromB.map((doc, index) => [`${index + 3}`, doc]),
		);

		// Merge Store A's documents into Store B
		await storeB.merge(storeDataFromA);

		// Merge Store B's documents into Store A
		await storeA.merge(storeDataFromB);

		// Verify both stores now contain all 4 documents
		const allItemsA = await storeA.all();
		const allItemsB = await storeB.all();

		expect(allItemsA).toEqual({
			'1': { title: 'Task A1', completed: false },
			'2': { title: 'Task A2', completed: true },
			'3': { title: 'Task B1', completed: false },
			'4': { title: 'Task B2', completed: true },
		});

		expect(allItemsB).toEqual({
			'1': { title: 'Task A1', completed: false },
			'2': { title: 'Task A2', completed: true },
			'3': { title: 'Task B1', completed: false },
			'4': { title: 'Task B2', completed: true },
		});

		// Verify final hashes are identical
		const finalHashesA = await storeA.getHashes();
		const finalHashesB = await storeB.getHashes();
		expect(finalHashesA.root).toBe(finalHashesB.root);
	});
});
