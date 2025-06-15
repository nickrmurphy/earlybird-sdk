import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { createMemoryAdapter } from './storage/memory-adapter';
import { type CRDTStore, createStore } from './store';
import type { HLC } from './utils/hlc';

const todoSchema = z.object({
	title: z.string().min(2).max(100),
	completed: z.boolean().default(false),
});

describe('Store', () => {
	test('should return all items deserialized', async () => {
		const exampleStoreData: CRDTStore<typeof todoSchema> = {
			'123': {
				title: {
					_value: 'Example Todo',
					_hlc: 'some-example-hlc' as HLC,
				},
				completed: {
					_value: false,
					_hlc: 'some-example-hlc' as HLC,
				},
			},
		};

		const adapter = createMemoryAdapter();
		adapter.saveData(JSON.stringify(exampleStoreData));

		const store = createStore('test', {
			schema: todoSchema,
			adapter,
		});

		const items = await store.all();
		expect(items).toEqual({
			'123': { title: 'Example Todo', completed: false },
		});
	});
});
