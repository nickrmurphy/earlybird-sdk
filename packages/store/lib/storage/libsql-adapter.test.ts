/**
 * @vitest-environment node
 */

import { createClient } from '@libsql/client';
import { describe, expect, it } from 'vitest';
import { createLibSQLAdapter } from './libsql-adapter';

describe('LibSQL Storage Adapter (Node.js)', () => {
	it('should work with in-memory database', async () => {
		const uniqueCollection = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const client = createClient({
			url: ':memory:',
		});

		const adapter = createLibSQLAdapter(uniqueCollection, {
			client,
			tablePrefix: 'test_store',
		});

		// Test loadData returns null initially
		expect(await adapter.loadData()).toBeNull();

		// Test saveData and loadData
		await adapter.saveData('{"test": "data"}');
		expect(await adapter.loadData()).toBe('{"test": "data"}');

		// Test loadHLC returns null initially
		expect(await adapter.loadHLC()).toBeNull();

		// Test saveHLC and loadHLC
		await adapter.saveHLC('hlc-data');
		expect(await adapter.loadHLC()).toBe('hlc-data');

		// Test data isolation
		expect(await adapter.loadData()).toBe('{"test": "data"}');
		expect(await adapter.loadHLC()).toBe('hlc-data');
	});

	it('should isolate collections properly', async () => {
		const client = createClient({
			url: ':memory:',
		});

		const adapter1 = createLibSQLAdapter('collection1', {
			client,
			tablePrefix: 'test_store',
		});

		const adapter2 = createLibSQLAdapter('collection2', {
			client,
			tablePrefix: 'test_store',
		});

		// Save data to first collection
		await adapter1.saveData('{"collection": "1"}');
		await adapter1.saveHLC('hlc1');

		// Save data to second collection
		await adapter2.saveData('{"collection": "2"}');
		await adapter2.saveHLC('hlc2');

		// Verify isolation
		expect(await adapter1.loadData()).toBe('{"collection": "1"}');
		expect(await adapter1.loadHLC()).toBe('hlc1');

		expect(await adapter2.loadData()).toBe('{"collection": "2"}');
		expect(await adapter2.loadHLC()).toBe('hlc2');
	});

	it('should support custom table prefixes', async () => {
		const uniqueCollection = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const client = createClient({
			url: ':memory:',
		});

		const adapter = createLibSQLAdapter(uniqueCollection, {
			client,
			tablePrefix: 'custom_prefix',
		});

		// Should work the same way regardless of prefix
		await adapter.saveData('{"custom": "prefix"}');
		expect(await adapter.loadData()).toBe('{"custom": "prefix"}');
	});

	it('should handle listener notifications', async () => {
		const uniqueCollection = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const client = createClient({
			url: ':memory:',
		});

		const adapter = createLibSQLAdapter(uniqueCollection, {
			client,
		});

		let notificationCount = 0;
		const listener = () => {
			notificationCount++;
		};

		adapter.registerListener('test-listener', listener);
		await adapter.saveData('{"test": "data"}');

		expect(notificationCount).toBe(1);

		// saveHLC should not trigger notifications
		await adapter.saveHLC('hlc-data');
		expect(notificationCount).toBe(1);

		adapter.unregisterListener('test-listener');
		await adapter.saveData('{"test": "data2"}');

		// Should not increment after unregistering
		expect(notificationCount).toBe(1);
	});
});
