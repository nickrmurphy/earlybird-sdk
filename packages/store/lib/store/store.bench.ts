/// <reference types="@vitest/browser/providers/playwright" />

import type { StorageAdapter } from '../storage/types';

import { Directory, Filesystem } from '@capacitor/filesystem';
import { bench, describe } from 'vitest';
import { z } from 'zod';
import { createCapacitorAdapter } from '../storage/capacitor-adapter';
import { createMemoryAdapter } from '../storage/memory-adapter';
import { createStore } from './store';

const todoSchema = z.object({
	title: z.string().min(2).max(100),
	completed: z.boolean().default(false),
	description: z.string().optional(),
	priority: z.enum(['low', 'medium', 'high']).default('medium'),
	tags: z.array(z.string()).default([]),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

type TodoInput = z.infer<typeof todoSchema>;

type AdapterFactory = () => StorageAdapter;

const generateTodo = (index: number): TodoInput => ({
	title: `Task ${index}`,
	completed: index % 3 === 0,
	description: `Description for task ${index}`,
	priority: ['low', 'medium', 'high'][index % 3] as 'low' | 'medium' | 'high',
	tags: [`tag-${index % 5}`, `category-${index % 3}`],
	createdAt: new Date(),
	updatedAt: new Date(),
});

const generateTodos = (
	count: number,
): Array<{ id: string; value: TodoInput }> =>
	Array.from({ length: count }, (_, i) => ({
		id: `todo-${i}`,
		value: generateTodo(i),
	}));

const createStoreBenchmarks = (
	adapterName: string,
	createAdapter: AdapterFactory,
) => {
	describe(`Store Benchmarks - ${adapterName}`, () => {
		const collectionName = `bench-${adapterName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 9)}`;

		describe('Single Item Operations', () => {
			bench(
				'create single item',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					const todo = generateTodo(1);
					await store.create('bench-single', todo);
				},
				{ iterations: 100 },
			);

			bench(
				'get single item',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					// Setup
					const todo = generateTodo(1);
					await store.create('bench-get', todo);

					// Benchmark
					await store.get('bench-get');
				},
				{ iterations: 1000 },
			);

			bench(
				'update single item',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					// Setup
					const todo = generateTodo(1);
					await store.create('bench-update', todo);

					// Benchmark
					await store.update('bench-update', {
						title: 'Updated Task',
						completed: true,
					});
				},
				{ iterations: 100 },
			);
		});

		describe('Batch Operations', () => {
			bench(
				'createMany - 10 items',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					const todos = generateTodos(10);
					await store.createMany(todos);
				},
				{ iterations: 50 },
			);

			bench(
				'createMany - 100 items',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					const todos = generateTodos(100);
					await store.createMany(todos);
				},
				{ iterations: 10 },
			);

			bench(
				'createMany - 1000 items',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					const todos = generateTodos(1000);
					await store.createMany(todos);
				},
				{ iterations: 5 },
			);

			bench(
				'updateMany - 10 items',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					// Setup
					const todos = generateTodos(10);
					await store.createMany(todos);

					// Benchmark
					const updates = todos.map(({ id }) => ({
						id,
						value: { completed: true, updatedAt: new Date() },
					}));
					await store.updateMany(updates);
				},
				{ iterations: 50 },
			);

			bench(
				'updateMany - 100 items',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					// Setup
					const todos = generateTodos(100);
					await store.createMany(todos);

					// Benchmark
					const updates = todos.map(({ id }) => ({
						id,
						value: { completed: true, updatedAt: new Date() },
					}));
					await store.updateMany(updates);
				},
				{ iterations: 10 },
			);
		});

		describe('Read Operations', () => {
			bench(
				'all() - 10 items',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					// Setup
					const todos = generateTodos(10);
					await store.createMany(todos);

					// Benchmark
					await store.all();
				},
				{ iterations: 100 },
			);

			bench(
				'all() - 100 items',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					// Setup
					const todos = generateTodos(100);
					await store.createMany(todos);

					// Benchmark
					await store.all();
				},
				{ iterations: 50 },
			);

			bench(
				'all() - 1000 items',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					// Setup
					const todos = generateTodos(1000);
					await store.createMany(todos);

					// Benchmark
					await store.all();
				},
				{ iterations: 10 },
			);

			bench(
				'multiple get() calls - 100 items',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					// Setup
					const todos = generateTodos(100);
					await store.createMany(todos);

					// Benchmark - get 10 random items
					const promises = Array.from({ length: 10 }, (_, i) =>
						store.get(`todo-${i * 10}`),
					);
					await Promise.all(promises);
				},
				{ iterations: 50 },
			);
		});

		describe('Mixed Workload', () => {
			bench(
				'realistic workflow - CRUD operations',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					// Create initial data
					const initialTodos = generateTodos(50);
					await store.createMany(initialTodos);

					// Read all items
					await store.all();

					// Update some items
					const updates = Array.from({ length: 10 }, (_, i) => ({
						id: `todo-${i}`,
						value: { completed: true, updatedAt: new Date() },
					}));
					await store.updateMany(updates);

					// Get specific items
					await store.get('todo-5');
					await store.get('todo-15');
					await store.get('todo-25');

					// Create more items
					const newTodos = Array.from({ length: 5 }, (_, i) => ({
						id: `new-todo-${i}`,
						value: generateTodo(i + 100),
					}));
					await store.createMany(newTodos);

					// Final read
					await store.all();
				},
				{ iterations: 10 },
			);
		});

		describe('Schema Validation Performance', () => {
			bench(
				'validation overhead - simple schema',
				async () => {
					const simpleSchema = z.object({
						name: z.string(),
						active: z.boolean(),
					});

					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: simpleSchema,
						adapter,
					});

					await store.create('simple', { name: 'Test', active: true });
				},
				{ iterations: 200 },
			);

			bench(
				'validation overhead - complex schema',
				async () => {
					const complexSchema = z.object({
						title: z.string().min(2).max(100),
						completed: z.boolean().default(false),
						description: z.string().optional(),
						priority: z.enum(['low', 'medium', 'high']).default('medium'),
						tags: z.array(z.string()).default([]),
						metadata: z
							.object({
								createdBy: z.string(),
								category: z.string(),
								estimatedHours: z.number().min(0).max(40),
								dependencies: z.array(z.string()),
							})
							.optional(),
						createdAt: z.date().default(() => new Date()),
						updatedAt: z.date().default(() => new Date()),
					});

					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: complexSchema,
						adapter,
					});

					await store.create('complex', {
						title: 'Complex Task',
						completed: false,
						description: 'A task with complex validation',
						priority: 'high',
						tags: ['important', 'urgent'],
						metadata: {
							createdBy: 'user-123',
							category: 'development',
							estimatedHours: 8,
							dependencies: ['task-1', 'task-2'],
						},
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				},
				{ iterations: 200 },
			);
		});

		describe('Listener Performance', () => {
			bench(
				'operations with listeners - 1 listener',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					let callCount = 0;
					store.registerListener('test', () => {
						callCount++;
					});

					await store.create('listener-test', generateTodo(1));
					await store.update('listener-test', { completed: true });
				},
				{ iterations: 100 },
			);

			bench(
				'operations with listeners - 10 listeners',
				async () => {
					const adapter = createAdapter();
					const store = createStore(collectionName, {
						schema: todoSchema,
						adapter,
					});

					let callCount = 0;
					for (let i = 0; i < 10; i++) {
						store.registerListener(`test-${i}`, () => {
							callCount++;
						});
					}

					await store.create('multi-listener-test', generateTodo(1));
					await store.update('multi-listener-test', { completed: true });
				},
				{ iterations: 100 },
			);
		});

		describe('Storage Adapter Performance', () => {
			bench(
				'adapter saveData - small payload',
				async () => {
					const adapter = createAdapter();
					const smallData = JSON.stringify({ test: 'data' });
					await adapter.saveData(smallData);
				},
				{ iterations: 200 },
			);

			bench(
				'adapter saveData - medium payload (100 items)',
				async () => {
					const adapter = createAdapter();
					const todos = generateTodos(100);
					const mediumData = JSON.stringify(todos);
					await adapter.saveData(mediumData);
				},
				{ iterations: 50 },
			);

			bench(
				'adapter saveData - large payload (1000 items)',
				async () => {
					const adapter = createAdapter();
					const todos = generateTodos(1000);
					const largeData = JSON.stringify(todos);
					await adapter.saveData(largeData);
				},
				{ iterations: 10 },
			);

			bench(
				'adapter loadData after save',
				async () => {
					const adapter = createAdapter();
					const testData = JSON.stringify(generateTodos(50));
					await adapter.saveData(testData);
					await adapter.loadData();
				},
				{ iterations: 100 },
			);
		});
	});
};

// Create benchmarks for different adapters
createStoreBenchmarks('Memory Adapter', () => createMemoryAdapter());

createStoreBenchmarks('Capacitor Adapter', () =>
	createCapacitorAdapter(
		`capacitor-bench-${Math.random().toString(36).substr(2, 9)}`,
		{
			fs: Filesystem,
			directory: Directory.Temporary,
		},
	),
);
