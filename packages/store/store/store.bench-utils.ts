import { bench, describe } from 'vitest';
import { z } from 'zod';
import type { StorageAdapter } from '../storage/types';
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

export const createStoreBenchmarks = (
	name: string,
	createAdapter: () => StorageAdapter,
	cleanup?: () => void | Promise<void>,
	itemCount = 1000,
) => {
	describe(`${name} Store Performance`, () => {
		bench(`insert ${itemCount.toLocaleString()} items`, async () => {
			const adapter = createAdapter();
			const store = createStore('users', { adapter, schema: userSchema });

			for (let i = 0; i < itemCount; i++) {
				await store.insert(i.toString(), generateUser(i));
			}

			if (cleanup) {
				await cleanup();
			}
		});

		bench(`get ${itemCount.toLocaleString()} items after insert`, async () => {
			const adapter = createAdapter();
			const store = createStore('users', { adapter, schema: userSchema });

			// Setup
			for (let i = 0; i < itemCount; i++) {
				await store.insert(i.toString(), generateUser(i));
			}

			// Benchmark
			for (let i = 0; i < itemCount; i++) {
				await store.get(i.toString());
			}

			if (cleanup) {
				await cleanup();
			}
		});

		bench(`all() with ${itemCount.toLocaleString()} items`, async () => {
			const adapter = createAdapter();
			const store = createStore('users', { adapter, schema: userSchema });

			// Setup
			for (let i = 0; i < itemCount; i++) {
				await store.insert(i.toString(), generateUser(i));
			}

			// Benchmark
			await store.all();

			if (cleanup) {
				await cleanup();
			}
		});

		bench(
			`all() with predicate on ${itemCount.toLocaleString()} items`,
			async () => {
				const adapter = createAdapter();
				const store = createStore('users', { adapter, schema: userSchema });

				// Setup
				for (let i = 0; i < itemCount; i++) {
					await store.insert(i.toString(), generateUser(i));
				}

				// Benchmark
				await store.all((user) => user.active && user.age > 30);

				if (cleanup) {
					await cleanup();
				}
			},
		);

		bench(`update ${itemCount.toLocaleString()} items`, async () => {
			const adapter = createAdapter();
			const store = createStore('users', { adapter, schema: userSchema });

			// Setup
			for (let i = 0; i < itemCount; i++) {
				await store.insert(i.toString(), generateUser(i));
			}

			// Benchmark
			for (let i = 0; i < itemCount; i++) {
				await store.update(i.toString(), { age: 25 });
			}

			if (cleanup) {
				await cleanup();
			}
		});
	});
};
