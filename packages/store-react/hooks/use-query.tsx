import { useCallback, useEffect, useId, useState } from 'react';
import type { InferStoreType, StoreRegistry } from '../types';

export function createUseQuery<T extends StoreRegistry>(
	useStore: <K extends keyof T>(collection: K) => T[K],
) {
	const useQuery = <
		K extends keyof T,
		TResult = Record<string, InferStoreType<T[K]>>,
	>(
		collection: K,
		transform?: (data: Record<string, InferStoreType<T[K]>>) => TResult,
		deps: React.DependencyList = [],
	) => {
		const stableTransform = transform
			? useCallback(transform, deps)
			: undefined;
		const queryId = useId();
		const store = useStore(collection);
		const [data, setData] = useState<TResult | null>(null);
		const [isLoading, setIsLoading] = useState(true);

		const listenerFn = useCallback(async () => {
			const result = await store.all();
			let data: TResult;

			if (result) {
				data = stableTransform ? stableTransform(result) : (result as TResult);
			} else {
				data = stableTransform ? stableTransform({}) : ({} as TResult);
			}

			setData(data);
			setIsLoading(false);
		}, [stableTransform, store, ...deps]);

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
