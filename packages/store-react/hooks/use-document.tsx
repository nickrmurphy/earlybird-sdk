import { useCallback, useEffect, useState } from 'react';
import type { InferStoreType, StoreRegistry } from '../types';

export function createUseDocument<T extends StoreRegistry>(
	useStore: <K extends keyof T>(collection: K) => T[K],
) {
	const useDocument = <K extends keyof T>(collection: K, id: string | null | undefined) => {
		const store = useStore(collection);
		const queryId = `document-${String(collection)}-${id}`;
		const [data, setData] = useState<InferStoreType<T[K]> | null>(null);
		const [isLoading, setIsLoading] = useState(!id);

		const listenerFn = useCallback(async () => {
			if (!id) {
				setData(null);
				setIsLoading(false);
				return;
			}
			const result = await store.get(id);
			setData(result);
			setIsLoading(false);
		}, [id, store]);

		useEffect(() => {
			listenerFn();
		}, [listenerFn]);

		useEffect(() => {
			if (!id) return;
			
			store.addListener(queryId, listenerFn);

			return () => {
				store.removeListener(queryId);
			};
		}, [listenerFn, store, queryId, id]);

		return {
			data,
			isLoading,
		};
	};

	return useDocument;
}
