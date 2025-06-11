import { bench, describe } from 'vitest';
import { z } from 'zod';
import { createMemoryAdapter } from '../storage/memory-adapter';
import { createStore } from './store';

const userSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().email(),
	age: z.number(),
	active: z.boolean(),
});

type User = z.infer<typeof userSchema>;

const generateUser = (id: number): User => ({
	id: id.toString(),
	name: `User ${id}`,
	email: `user${id}@example.com`,
	age: 20 + (id % 50),
	active: id % 2 === 0,
});

describe('Store Performance', () => {
	bench('insert 10,000 items', async () => {
		const adapter = createMemoryAdapter();
		const store = createStore('users', { adapter, schema: userSchema });

		for (let i = 0; i < 10000; i++) {
			await store.insert(i.toString(), generateUser(i));
		}
	});

	bench('get 10,000 items after insert', async () => {
		const adapter = createMemoryAdapter();
		const store = createStore('users', { adapter, schema: userSchema });

		// Setup
		for (let i = 0; i < 10000; i++) {
			await store.insert(i.toString(), generateUser(i));
		}

		// Benchmark
		for (let i = 0; i < 10000; i++) {
			await store.get(i.toString());
		}
	});

	bench('all() with 10,000 items', async () => {
		const adapter = createMemoryAdapter();
		const store = createStore('users', { adapter, schema: userSchema });

		// Setup
		for (let i = 0; i < 10000; i++) {
			await store.insert(i.toString(), generateUser(i));
		}

		// Benchmark
		await store.all();
	});

	bench('all() with predicate on 10,000 items', async () => {
		const adapter = createMemoryAdapter();
		const store = createStore('users', { adapter, schema: userSchema });

		// Setup
		for (let i = 0; i < 10000; i++) {
			await store.insert(i.toString(), generateUser(i));
		}

		// Benchmark
		await store.all((user) => user.active && user.age > 30);
	});

	bench('update 10,000 items', async () => {
		const adapter = createMemoryAdapter();
		const store = createStore('users', { adapter, schema: userSchema });

		// Setup
		for (let i = 0; i < 10000; i++) {
			await store.insert(i.toString(), generateUser(i));
		}

		// Benchmark
		for (let i = 0; i < 10000; i++) {
			await store.update(i.toString(), { age: 25 });
		}
	});
});
