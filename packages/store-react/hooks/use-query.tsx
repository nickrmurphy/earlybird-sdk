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
			const result = await store.all(stableWhere);
			if (stableSort) {
				result.sort(stableSort);
			}
			setData(result);
			setIsLoading(false);
		}, [stableWhere, stableSort, store]);

		useEffect(() => {
			listenerFn();
		}, [listenerFn]);

		useEffect(() => {
			store.addListener(queryId, listenerFn);

			return () => {
				store.removeListener(queryId);
			};
		}, [listenerFn, store, queryId]);

		return {
			data,
			isLoading,
		};
	};

	return useQuery;
}
