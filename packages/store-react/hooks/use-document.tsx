import { useCallback, useEffect, useState } from 'react';
import type { InferStoreType, StoreRegistry } from '../types';

type UseDocumentResult<TResult> =
	| { isLoading: true; data: null }
	| { isLoading: false; data: TResult | null };

export function createUseDocument<T extends StoreRegistry>(
	useStore: <K extends keyof T>(collection: K) => T[K],
) {
	const useDocument = <K extends keyof T>(
		collection: K,
		id: string | null | undefined,
	): UseDocumentResult<InferStoreType<T[K]>> => {
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

			store.registerListener(queryId, listenerFn);

			return () => {
				store.unregisterListener(queryId);
			};
		}, [listenerFn, store, queryId, id]);

		if (isLoading) {
			return { isLoading: true, data: null };
		}

		return { isLoading: false, data };
	};

	return useDocument;
}
