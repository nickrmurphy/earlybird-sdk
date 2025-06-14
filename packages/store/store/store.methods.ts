import type { StorageAdapter } from '../storage/types';
import type { StandardSchemaV1 } from './schema.types';

import { listRaw, readRaw, writeRaw } from './store.operations';
import { standardValidate } from './utils';

export const get = <T extends StandardSchemaV1>(
	adapter: StorageAdapter,
	collection: string,
	schema: T,
) => {
	return async (
		id: string,
	): Promise<StandardSchemaV1.InferOutput<T> | null> => {
		const raw = await readRaw(adapter, collection, id);
		if (!raw) return null;
		return standardValidate(schema, raw);
	};
};

export const all = <T extends StandardSchemaV1>(
	adapter: StorageAdapter,
	collection: string,
	schema: T,
) => {
	return async (
		predicate?: (data: StandardSchemaV1.InferOutput<T>) => boolean,
	): Promise<StandardSchemaV1.InferOutput<T>[]> => {
		const docIds = await listRaw(adapter, collection);

		const results = await Promise.all(
			docIds.map(async (id) => {
				try {
					const raw = await readRaw(adapter, collection, id);
					if (!raw) return null;
					const validated = standardValidate(schema, raw);
					if (!predicate || predicate(validated)) {
						return validated;
					}
					return null;
				} catch {
					// Skip invalid documents
					return null;
				}
			}),
		);

		return results.filter((result) => result !== null);
	};
};

export const insert = <T extends StandardSchemaV1>(
	adapter: StorageAdapter,
	collection: string,
	schema: T,
	onMutate?: (type: 'insert' | 'update', id: string) => void,
) => {
	return async (
		id: string,
		data: StandardSchemaV1.InferOutput<T>,
	): Promise<void> => {
		// Validate before storing
		const validated = standardValidate(schema, data);
		await writeRaw(adapter, collection, id, validated);
		onMutate?.('insert', id);
	};
};

export const update = <T extends StandardSchemaV1>(
	adapter: StorageAdapter,
	collection: string,
	schema: T,
	onMutate?: (type: 'insert' | 'update', id: string) => void,
) => {
	return async (
		id: string,
		data: Partial<StandardSchemaV1.InferOutput<T>>,
	): Promise<void> => {
		const raw = await readRaw(adapter, collection, id);
		if (!raw) return;

		const merged = { ...raw, ...data };
		const validated = standardValidate(schema, merged);

		await writeRaw(adapter, collection, id, validated);
		onMutate?.('update', id);
	};
};
