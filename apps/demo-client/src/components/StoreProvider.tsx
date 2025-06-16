import type { PropsWithChildren } from 'react';

import { createDemoStores } from '@byearlybird/demo-shared';
import { createStoreProvider } from '@byearlybird/store-react';
import { createCapacitorAdapter } from '@byearlybird/store/capacitor-adapter';
import { Directory, Filesystem } from '@capacitor/filesystem';

// Create storage adapters
const recipeAdapter = createCapacitorAdapter('recipes', {
	fs: Filesystem,
	directory: Directory.Data,
});

const ingredientAdapter = createCapacitorAdapter('ingredients', {
	fs: Filesystem,
	directory: Directory.Data,
});

// Create the stores using shared configuration
const stores = createDemoStores({
	recipes: recipeAdapter,
	ingredients: ingredientAdapter,
});

// Create the typed provider and hooks
const {
	StoreProvider: BaseStoreProvider,
	useStore,
	useStores,
	useQuery,
	useDocument,
} = createStoreProvider<typeof stores>();

// Export the hooks for use in components
export { useStore, useStores, useQuery, useDocument };

export const StoreProvider = ({ children }: PropsWithChildren) => {
	return <BaseStoreProvider stores={stores}>{children}</BaseStoreProvider>;
};
