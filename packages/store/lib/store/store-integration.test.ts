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

	test('should synchronize an empty store with a populated store', async () => {
		// Create a populated store
		const populatedStore = createStore('populated-store', {
			schema: todoSchema,
			adapter: createMemoryAdapter(),
		});

		await populatedStore.create('1', { title: 'Existing Task 1', completed: false });
		await populatedStore.create('2', { title: 'Existing Task 2', completed: true });
		await populatedStore.create('3', { title: 'Existing Task 3', completed: false });

		// Create an empty store
		const emptyStore = createStore('empty-store', {
			schema: todoSchema,
			adapter: createMemoryAdapter(),
		});

		// Verify initial states
		const populatedItems = await populatedStore.all();
		const emptyItems = await emptyStore.all();

		expect(Object.keys(populatedItems || {})).toHaveLength(3);
		expect(emptyItems).toBeNull(); // Empty store returns null

		const populatedHashes = await populatedStore.getHashes();
		const emptyHashes = await emptyStore.getHashes();

		expect(populatedHashes.root).toBeTruthy();
		expect(emptyHashes.root).toBe(''); // Empty store has empty root hash
		expect(populatedHashes.root).not.toBe(emptyHashes.root);

		// Get all documents from populated store for merging
		const docsFromPopulated = await populatedStore.getDocumentsByBucket([0]);
		expect(Object.keys(docsFromPopulated)).toHaveLength(3);

		// Merge populated store's documents into empty store
		await emptyStore.merge(docsFromPopulated);

		// Verify empty store now has all documents
		const syncedItems = await emptyStore.all();
		expect(syncedItems).toEqual({
			'1': { title: 'Existing Task 1', completed: false },
			'2': { title: 'Existing Task 2', completed: true },
			'3': { title: 'Existing Task 3', completed: false },
		});

		// Verify both stores now have identical hashes
		const finalPopulatedHashes = await populatedStore.getHashes();
		const finalEmptyHashes = await emptyStore.getHashes();
		expect(finalPopulatedHashes.root).toBe(finalEmptyHashes.root);

		// Verify both stores have identical content
		const finalPopulatedItems = await populatedStore.all();
		const finalEmptyItems = await emptyStore.all();
		expect(finalPopulatedItems).toEqual(finalEmptyItems);
	});

	test('should handle incremental synchronization through multiple rounds', async () => {
		// Create two stores and establish initial sync
		const storeA = createStore('incremental-a', {
			schema: todoSchema,
			adapter: createMemoryAdapter(),
		});

		const storeB = createStore('incremental-b', {
			schema: todoSchema,
			adapter: createMemoryAdapter(),
		});

		// Round 1: Initial data and sync
		await storeA.create('1', { title: 'Initial Task A', completed: false });
		await storeB.create('2', { title: 'Initial Task B', completed: true });

		// Sync initial data
		const round1DocsA = await storeA.getDocumentsByBucket([0]);
		const round1DocsB = await storeB.getDocumentsByBucket([0]);

		await storeA.merge(round1DocsB);
		await storeB.merge(round1DocsA);

		// Verify both stores are synchronized after round 1
		const round1HashesA = await storeA.getHashes();
		const round1HashesB = await storeB.getHashes();
		expect(round1HashesA.root).toBe(round1HashesB.root);

		const round1ItemsA = await storeA.all();
		const round1ItemsB = await storeB.all();
		expect(round1ItemsA).toEqual(round1ItemsB);
		expect(Object.keys(round1ItemsA || {})).toHaveLength(2);

		// Round 2: Make additional changes
		await storeA.create('3', { title: 'Round 2 Task A', completed: false });
		await storeA.update('1', { title: 'Updated Initial Task A' });

		await storeB.create('4', { title: 'Round 2 Task B', completed: true });
		await storeB.update('2', { completed: false });

		// Verify stores have different hashes before round 2 sync
		const preRound2HashesA = await storeA.getHashes();
		const preRound2HashesB = await storeB.getHashes();
		expect(preRound2HashesA.root).not.toBe(preRound2HashesB.root);

		// Sync round 2 changes
		const round2DocsA = await storeA.getDocumentsByBucket([0]);
		const round2DocsB = await storeB.getDocumentsByBucket([0]);

		await storeA.merge(round2DocsB);
		await storeB.merge(round2DocsA);

		// Verify both stores are synchronized after round 2
		const round2HashesA = await storeA.getHashes();
		const round2HashesB = await storeB.getHashes();
		expect(round2HashesA.root).toBe(round2HashesB.root);

		const round2ItemsA = await storeA.all();
		const round2ItemsB = await storeB.all();
		expect(round2ItemsA).toEqual(round2ItemsB);
		expect(Object.keys(round2ItemsA || {})).toHaveLength(4);

		// Verify final state contains all expected changes
		expect(round2ItemsA).toEqual({
			'1': { title: 'Updated Initial Task A', completed: false },
			'2': { title: 'Initial Task B', completed: false },
			'3': { title: 'Round 2 Task A', completed: false },
			'4': { title: 'Round 2 Task B', completed: true },
		});

		// Round 3: Test one more round with minimal changes
		await storeA.update('3', { completed: true });
		await storeB.create('5', { title: 'Final Task', completed: false });

		// Final sync
		const round3DocsA = await storeA.getDocumentsByBucket([0]);
		const round3DocsB = await storeB.getDocumentsByBucket([0]);

		await storeA.merge(round3DocsB);
		await storeB.merge(round3DocsA);

		// Final verification
		const finalHashesA = await storeA.getHashes();
		const finalHashesB = await storeB.getHashes();
		expect(finalHashesA.root).toBe(finalHashesB.root);

		const finalItemsA = await storeA.all();
		const finalItemsB = await storeB.all();
		expect(finalItemsA).toEqual(finalItemsB);
		expect(Object.keys(finalItemsA || {})).toHaveLength(5);
	});
});
