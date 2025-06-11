import type { StorageAdapter } from '../storage/types';
import type { StandardSchemaV1 } from './schema.types';
import type { MutationListener, Store } from './types';

import { all, get, insert, update } from './store.methods';

// Store factory with validation at the store method level
type StoreConfig<T extends StandardSchemaV1> = {
	adapter: StorageAdapter;
	schema: T;
};

// External state management for functional approach
type StoreState<T> = {
	cache: Map<string, T[]>;
	listeners: Map<string, MutationListener>;
};

const createStoreState = <T>(): StoreState<T> => ({
	cache: new Map<string, T[]>(),
	listeners: new Map<string, MutationListener>(),
});

// Pure cache operations
const getCachedData = async <T>(
	cache: Map<string, T[]>,
	key: string,
	computeFn: () => Promise<T[]>,
): Promise<T[]> => {
	if (cache.has(key)) {
		// biome-ignore lint/style/noNonNullAssertion: Has check ensures value exists
		return cache.get(key)!;
	}
	const data = await computeFn();
	cache.set(key, data);
	return data;
};

// Deterministic cache key generation
const createCacheKey = (predicate?: (data: unknown) => boolean): string => {
	if (!predicate) return 'all';
	// Create a more stable key than toString()
	return `predicate_${predicate.toString().replace(/\s+/g, '')}`;
};

const notifyListeners = <T>(
	listeners: Map<string, MutationListener>,
	cache: Map<string, T[]>,
	type: 'insert' | 'update',
	id: string,
): void => {
	cache.clear();
	for (const listener of listeners.values()) {
		listener(type, id);
	}
};

export const createStore = <T extends StandardSchemaV1>(
	collection: string,
	config: StoreConfig<T>,
): Store<StandardSchemaV1.InferOutput<T>> => {
	type InferredType = StandardSchemaV1.InferOutput<T>;

	const state = createStoreState<InferredType>();

	const handleNotification = (type: 'insert' | 'update', id: string) => {
		notifyListeners(state.listeners, state.cache, type, id);
	};

	const cachedAll = async (predicate?: (data: InferredType) => boolean) => {
		const cacheKey = createCacheKey(predicate);

		return getCachedData(state.cache, cacheKey, async () => {
			const rawData = state.cache.has('all')
				? // biome-ignore lint/style/noNonNullAssertion: Has check ensures value exists
					state.cache.get('all')!
				: await all(config.adapter, collection, config.schema)();

			return predicate ? rawData.filter(predicate) : rawData;
		});
	};

	return {
		get: get(config.adapter, collection, config.schema),
		all: cachedAll,
		insert: insert(
			config.adapter,
			collection,
			config.schema,
			handleNotification,
		),
		update: update(
			config.adapter,
			collection,
			config.schema,
			handleNotification,
		),
		addListener: (key: string, listener: MutationListener) => {
			state.listeners.set(key, listener);
		},
		removeListener: (key: string) => {
			state.listeners.delete(key);
		},
	};
};
