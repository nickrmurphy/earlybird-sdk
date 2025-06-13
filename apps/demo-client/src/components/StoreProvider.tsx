import { createStore } from '@byearlybird/store';
import { createStoreProvider } from '@byearlybird/store-react';
import { createCapacitorAdapter } from '@byearlybird/store/capacitor-adapter';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { ingredientSchema, recipeSchema } from '../schema';

// Create storage adapter (using memory adapter for demo)
const adapter = createCapacitorAdapter({
	fs: Filesystem,
	directory: Directory.Data,
});

// Create the stores
const recipesStore = createStore('recipes', { adapter, schema: recipeSchema });
const ingredientsStore = createStore('ingredients', {
	adapter,
	schema: ingredientSchema,
});

// Store registry
const stores = {
	recipes: recipesStore,
	ingredients: ingredientsStore,
} as const;

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

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
	return <BaseStoreProvider stores={stores}>{children}</BaseStoreProvider>;
};
