import { createUseDocument } from '../../hooks/use-document';
import { createUseQuery } from '../../hooks/use-query';
import { createUseStore, createUseStores } from '../../hooks/use-store';
import type { StoreRegistry } from '../../types';
import { createStoreContext } from './context';
import { createStoreProvider as createProvider } from './provider';

function createStoreProvider<T extends StoreRegistry>() {
	const StoreContext = createStoreContext<T>();
	const StoreProvider = createProvider<T>(StoreContext);
	const useStore = createUseStore<T>(StoreContext);
	const useStores = createUseStores<T>(StoreContext);
	const useQuery = createUseQuery<T>(useStore);
	const useDocument = createUseDocument<T>(useStore);

	return { StoreProvider, useStore, useStores, useQuery, useDocument };
}

type UseStore = ReturnType<typeof createStoreProvider>['useStore'];
type UseStores = ReturnType<typeof createStoreProvider>['useStores'];
type StoreProviderProps = Parameters<
	ReturnType<typeof createStoreProvider>['StoreProvider']
>[0];

export { createStoreProvider };
export type { StoreRegistry, UseStore, UseStores };
export type {
	InferStoreType,
	UseQueryOptions,
	StoreProviderProps,
} from '../../types';
