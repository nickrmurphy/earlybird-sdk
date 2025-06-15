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

	test('should return a single item deserialized', async () => {
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

		const item = await store.get('123');
		expect(item).toEqual({ title: 'Example Todo', completed: false });
	});

	test('should create a new item', async () => {
		const adapter = createMemoryAdapter();
		const store = createStore('test', {
			schema: todoSchema,
			adapter,
		});

		const id = '1234';
		await store.create(id, { title: 'New Todo', completed: false });
		const item = await store.get(id);
		expect(item).toEqual({ title: 'New Todo', completed: false });
	});

	test('should create multiple new items', async () => {
		const adapter = createMemoryAdapter();
		const store = createStore('test', {
			schema: todoSchema,
			adapter,
		});

		const payload = [
			{ id: '1234', value: { title: 'New Todo 1', completed: false } },
			{ id: '5678', value: { title: 'New Todo 2', completed: true } },
		];

		await store.createMany(payload);
		const items = await store.all();
		expect(items).toEqual({
			'1234': { title: 'New Todo 1', completed: false },
			'5678': { title: 'New Todo 2', completed: true },
		});
	});

	test('should update an item', async () => {
		const adapter = createMemoryAdapter();
		const store = createStore('test', {
			schema: todoSchema,
			adapter,
		});

		await store.create('123', { title: 'Old title', completed: false });
		await store.update('123', { title: 'New title' });
		const item = await store.get('123');
		expect(item).toEqual({ title: 'New title', completed: false });
	});

	test('should update many items', async () => {
		const adapter = createMemoryAdapter();
		const store = createStore('test', {
			schema: todoSchema,
			adapter,
		});

		await store.createMany([
			{ id: '1234', value: { title: 'New Todo 1', completed: false } },
			{ id: '5678', value: { title: 'New Todo 2', completed: true } },
		]);
		await store.updateMany([
			{ id: '1234', value: { title: 'Updated Todo 1', completed: true } },
			{ id: '5678', value: { title: 'Updated Todo 2', completed: false } },
		]);
		const items = await store.all();
		expect(items).toEqual({
			'1234': { title: 'Updated Todo 1', completed: true },
			'5678': { title: 'Updated Todo 2', completed: false },
		});
	});
});
