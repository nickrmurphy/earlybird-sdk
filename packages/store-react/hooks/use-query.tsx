import { useCallback, useEffect, useId, useState } from 'react';
import type { InferStoreType, StoreRegistry, UseQueryOptions } from '../types';
import { useStableCallback } from './use-stable-callback';

export function createUseQuery<T extends StoreRegistry>(
	useStore: <K extends keyof T>(collection: K) => T[K],
) {
	const useQuery = <K extends keyof T>(
		collection: K,
		options: UseQueryOptions<K, T> = {},
	) => {
		const stableWhere = useStableCallback(options.where);
		const stableSort = useStableCallback(options.sort);
		const queryId = useId();
		const store = useStore(collection);
		const [data, setData] = useState<InferStoreType<T[K]>[]>([]);
		const [isLoading, setIsLoading] = useState(true);

		const listenerFn = useCallback(async () => {
			const result = await store.all();
			let data: InferStoreType<T[K]>[] = [];

			if (result) {
				// Convert object to array
				data = Object.values(result);
				if (stableWhere) {
					data = data.filter(stableWhere);
				}
				if (stableSort) {
					data.sort(stableSort);
				}
			}

			setData(data);
			setIsLoading(false);
		}, [stableWhere, stableSort, store]);

		useEffect(() => {
			listenerFn();
		}, [listenerFn]);

		useEffect(() => {
			store.registerListener(queryId, listenerFn);

			return () => {
				store.unregisterListener(queryId);
			};
		}, [listenerFn, store, queryId]);

		return {
			data,
			isLoading,
		};
	};

	return useQuery;
}
