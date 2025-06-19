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
		expect(Object.keys(docsFromA)).toHaveLength(2);

		// Get documents from Store B to merge into Store A
		const docsFromB = await storeB.getDocumentsByBucket([0]);
		expect(Object.keys(docsFromB)).toHaveLength(2);

		// Merge Store A's documents into Store B
		await storeB.merge(docsFromA);

		// Merge Store B's documents into Store A
		await storeA.merge(docsFromB);

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

	test('should resolve conflicting modifications to the same document using CRDT logic', async () => {
		// Create Store A and Store B with the same initial document
		const storeA = createStore('conflict-test-a', {
			schema: todoSchema,
			adapter: createMemoryAdapter(),
		});

		const storeB = createStore('conflict-test-b', {
			schema: todoSchema,
			adapter: createMemoryAdapter(),
		});

		// Both stores create the same document initially
		await storeA.create('shared-task', { title: 'Original Task', completed: false });
		await storeB.create('shared-task', { title: 'Original Task', completed: false });

		// Simulate concurrent modifications to the same document
		// Store A updates the title
		await storeA.update('shared-task', { title: 'Task Updated by A' });

		// Store B updates the completed status (and potentially title too)
		await storeB.update('shared-task', { completed: true, title: 'Task Updated by B' });

		// Get current state before merge
		const beforeMergeA = await storeA.get('shared-task');
		const beforeMergeB = await storeB.get('shared-task');

		expect(beforeMergeA).toEqual({ title: 'Task Updated by A', completed: false });
		expect(beforeMergeB).toEqual({ title: 'Task Updated by B', completed: true });

		// Get documents from each store for merging
		const docsFromA = await storeA.getDocumentsByBucket([0]);
		const docsFromB = await storeB.getDocumentsByBucket([0]);

		// Merge Store A's changes into Store B
		await storeB.merge(docsFromA);

		// Merge Store B's changes into Store A  
		await storeA.merge(docsFromB);

		// After merge, both stores should have the same resolved state
		const finalStateA = await storeA.get('shared-task');
		const finalStateB = await storeB.get('shared-task');

		// Both stores should have identical final state (CRDT resolution)
		expect(finalStateA).toEqual(finalStateB);

		// The resolution should contain the most recent changes based on HLC timestamps
		// Since this is a last-writer-wins resolution, we expect the values to be determined by the latest HLC
		expect(finalStateA).toBeTruthy();
		expect(finalStateA?.title).toBeTruthy();
		expect(typeof finalStateA?.completed).toBe('boolean');

		// Verify both stores have identical hashes after conflict resolution
		const finalHashesA = await storeA.getHashes();
		const finalHashesB = await storeB.getHashes();
		expect(finalHashesA.root).toBe(finalHashesB.root);
	});
});
