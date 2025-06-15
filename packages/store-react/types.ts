import type { Store } from '@byearlybird/store';
import type { ReactNode } from 'react';
import type { StandardSchemaV1 } from './standard-schema.types';

// biome-ignore lint/suspicious/noExplicitAny: Store<T> variance requires any; type safety recovered via InferStoreType
export type StoreRegistry = Record<string, Store<any>>;

export type InferStoreType<S> = S extends Store<infer T>
	? StandardSchemaV1.InferOutput<T>
	: never;

export interface StoreProviderProps<T extends StoreRegistry> {
	stores: T;
	children: ReactNode;
}

export interface UseQueryOptions<K extends keyof T, T extends StoreRegistry> {
	where?: (data: InferStoreType<T[K]>) => boolean;
	sort?: (a: InferStoreType<T[K]>, b: InferStoreType<T[K]>) => number;
}
