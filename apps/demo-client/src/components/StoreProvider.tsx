import type { Store } from '@byearlybird/store';
import type { z } from 'zod/v4';

import { createCapacitorAdapter, createStore } from '@byearlybird/store';
import { createStoreProvider } from '@byearlybird/store-react';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { entrySchema } from '../schema';

// Define the types from our schemas
type Entry = z.infer<typeof entrySchema>;

// Define our store registry
type AppStores = {
	entries: Store<Entry>;
};

// Create storage adapter (using memory adapter for demo)
const adapter = createCapacitorAdapter({
	fs: Filesystem,
	directory: Directory.Data,
});

// Create the stores
const entriesStore = createStore('entries', { adapter, schema: entrySchema });

// Create the typed provider and hooks
const {
	StoreProvider: BaseStoreProvider,
	useStore,
	useStores,
	useQuery,
} = createStoreProvider<AppStores>();

// Export the hooks for use in components
export { useStore, useStores, useQuery };

// Store registry
const stores: AppStores = {
	entries: entriesStore,
};

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
	return <BaseStoreProvider stores={stores}>{children}</BaseStoreProvider>;
};
