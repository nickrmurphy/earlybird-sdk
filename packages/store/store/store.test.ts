import * as v from 'valibot';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { createMemoryAdapter } from '../storage/memory-adapter';
import { createStore } from './store';

const userSchema = z.object({
	name: z.string(),
	age: z.number(),
});

test('store CRUD operations work together', async () => {
	const adapter = createMemoryAdapter();
	const store = createStore('test-users', { adapter, schema: userSchema });

	// Insert data
	await store.insert('1', { name: 'Alice', age: 25 });
	await store.insert('2', { name: 'Bob', age: 30 });

	// Get individual items
	const alice = await store.get('1');
	expect(alice).toEqual({ name: 'Alice', age: 25 });

	const bob = await store.get('2');
	expect(bob).toEqual({ name: 'Bob', age: 30 });

	// Get non-existent item
	const missing = await store.get('999');
	expect(missing).toBeNull();

	// Get all items
	const all = await store.all();
	expect(all).toHaveLength(2);
	expect(all).toContainEqual({ name: 'Alice', age: 25 });
	expect(all).toContainEqual({ name: 'Bob', age: 30 });

	// Get with predicate
	const adults = await store.all((user) => user.age >= 30);
	expect(adults).toHaveLength(1);
	expect(adults[0]).toEqual({ name: 'Bob', age: 30 });

	// Update item
	await store.update('1', { age: 26 });
	const updatedAlice = await store.get('1');
	expect(updatedAlice).toEqual({ name: 'Alice', age: 26 });

	// Update non-existent item (should be no-op)
	await store.update('999', { age: 100 });
	const stillMissing = await store.get('999');
	expect(stillMissing).toBeNull();
});

test('store works with different collections using same adapter', async () => {
	const adapter = createMemoryAdapter();
	const usersStore = createStore('users', { adapter, schema: userSchema });
	const adminsStore = createStore('admins', { adapter, schema: userSchema });

	// Insert in different collections
	await usersStore.insert('1', { name: 'User1', age: 25 });
	await adminsStore.insert('1', { name: 'Admin1', age: 30 });

	// Collections should be isolated
	const user = await usersStore.get('1');
	const admin = await adminsStore.get('1');

	expect(user).toEqual({ name: 'User1', age: 25 });
	expect(admin).toEqual({ name: 'Admin1', age: 30 });

	// All should only return items from respective collections
	const allUsers = await usersStore.all();
	const allAdmins = await adminsStore.all();

	expect(allUsers).toHaveLength(1);
	expect(allAdmins).toHaveLength(1);
	expect(allUsers[0]).toEqual({ name: 'User1', age: 25 });
	expect(allAdmins[0]).toEqual({ name: 'Admin1', age: 30 });
});

test('cross store querying', async () => {
	const colorSchema = z.object({
		name: z.string(),
		hex: z.string().length(6),
	});

	const userSchema = z.object({
		name: z.string(),
		age: z.number().min(0).max(150),
		favoriteColorId: z.string().optional(),
	});

	const adapter = createMemoryAdapter();
	const usersStore = createStore('users', { adapter, schema: userSchema });
	const colorsStore = createStore('colors', { adapter, schema: colorSchema });

	await colorsStore.insert('1', { name: 'Red', hex: 'FF0000' });
	await colorsStore.insert('2', { name: 'Green', hex: '00FF00' });

	await usersStore.insert('1', { name: 'Jack', age: 35, favoriteColorId: '1' });
	await usersStore.insert('2', { name: 'Sally', age: 34 });

	const getFavoriteColor = async (userId: string) => {
		const user = await usersStore.get(userId);
		if (!user || !user.favoriteColorId) return null;
		const color = await colorsStore.get(user.favoriteColorId);
		return color ? color.hex : null;
	};

	expect(await getFavoriteColor('1')).toBe('FF0000');
	expect(await getFavoriteColor('2')).toBe(null);
});

test('cache invalidation on mutations', async () => {
	const adapter = createMemoryAdapter();
	const store = createStore('cache-test', { adapter, schema: userSchema });

	// Prime the cache
	await store.insert('1', { name: 'Alice', age: 25 });
	await store.all(); // Cache 'all' query
	await store.all((u) => u.age > 20); // Cache filtered query

	// Update should invalidate cache
	await store.update('1', { age: 30 });

	// Fresh data should be returned
	const updated = await store.all((u) => u.age > 25);
	expect(updated).toHaveLength(1);
	expect(updated[0]?.age).toBe(30);
});

test('listener notifications work correctly', async () => {
	const adapter = createMemoryAdapter();
	const store = createStore('listeners', { adapter, schema: userSchema });

	const notifications: Array<{ type: string; id: string }> = [];

	store.addListener('test', (type, id) => {
		notifications.push({ type, id });
	});

	await store.insert('1', { name: 'Alice', age: 25 });
	await store.update('1', { age: 26 });

	expect(notifications).toHaveLength(2);
	expect(notifications[0]).toEqual({ type: 'insert', id: '1' });
	expect(notifications[1]).toEqual({ type: 'update', id: '1' });

	// Remove listener
	store.removeListener('test');
	await store.insert('2', { name: 'Bob', age: 30 });

	// Should not receive new notifications
	expect(notifications).toHaveLength(2);
});

test('cache key stability with predicates', async () => {
	const adapter = createMemoryAdapter();
	const store = createStore('cache-keys', { adapter, schema: userSchema });

	await store.insert('1', { name: 'Alice', age: 25 });
	await store.insert('2', { name: 'Bob', age: 30 });

	const predicate1 = (u: { age: number }) => u.age > 25;
	const predicate2 = (u: { age: number }) => u.age > 25; // Same logic, different function

	// First call should cache
	const result1 = await store.all(predicate1);

	// Second call with same predicate should use cache
	const result2 = await store.all(predicate1);

	// Third call with different function but same logic should create new cache entry
	const result3 = await store.all(predicate2);

	expect(result1).toEqual(result2);
	expect(result1).toEqual(result3);
	expect(result1).toHaveLength(1);
	expect(result1[0]?.name).toBe('Bob');
});

test('store works with Valibot schema', async () => {
	const valibotUserSchema = v.object({
		name: v.string(),
		age: v.number(),
	});

	const adapter = createMemoryAdapter();
	const store = createStore('valibot-users', {
		adapter,
		schema: valibotUserSchema,
	});

	// Insert data
	await store.insert('1', { name: 'Charlie', age: 28 });
	await store.insert('2', { name: 'Diana', age: 32 });

	// Get individual items
	const charlie = await store.get('1');
	expect(charlie).toEqual({ name: 'Charlie', age: 28 });

	// Get all items
	const all = await store.all();
	expect(all).toHaveLength(2);
	expect(all).toContainEqual({ name: 'Charlie', age: 28 });
	expect(all).toContainEqual({ name: 'Diana', age: 32 });

	// Update item
	await store.update('1', { age: 29 });
	const updatedCharlie = await store.get('1');
	expect(updatedCharlie).toEqual({ name: 'Charlie', age: 29 });
});

test('Valibot schema validation works with complex types', async () => {
	const productSchema = v.object({
		title: v.string(),
		price: v.pipe(v.number(), v.minValue(0)),
		category: v.picklist(['electronics', 'clothing', 'books']),
		tags: v.array(v.string()),
		inStock: v.boolean(),
	});

	const adapter = createMemoryAdapter();
	const store = createStore('valibot-products', {
		adapter,
		schema: productSchema,
	});

	const product = {
		title: 'Laptop',
		price: 999.99,
		category: 'electronics' as const,
		tags: ['computer', 'portable'],
		inStock: true,
	};

	await store.insert('laptop-1', product);

	const retrieved = await store.get('laptop-1');
	expect(retrieved).toEqual(product);

	// Filter by category
	const electronics = await store.all((p) => p.category === 'electronics');
	expect(electronics).toHaveLength(1);
	expect(electronics[0]).toEqual(product);
});
