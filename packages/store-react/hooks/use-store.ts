import { useContext } from 'react';
import type { StoreRegistry } from '../types';

export function createUseStore<T extends StoreRegistry>(
	StoreContext: React.Context<T | null>,
) {
	const useStore = <K extends keyof T>(collection: K): T[K] => {
		const stores = useContext(StoreContext);
		if (!stores) {
			throw new Error('useStore must be used within a StoreProvider');
		}

		return stores[collection];
	};

	return useStore;
}

export function createUseStores<T extends StoreRegistry>(
	StoreContext: React.Context<T | null>,
) {
	const useStores = (): T => {
		const stores = useContext(StoreContext);
		if (!stores) {
			throw new Error('useStores must be used within a StoreProvider');
		}

		return stores;
	};

	return useStores;
}
