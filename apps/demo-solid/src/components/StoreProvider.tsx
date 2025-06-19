import { createContext, useContext, type ParentComponent } from 'solid-js';
import { createDemoStores, type StoreAdapters } from '@byearlybird/demo-shared';
import { createMemoryAdapter } from '@byearlybird/store/memory-adapter';

// Create storage adapters (using memory for now)
const recipeAdapter = createMemoryAdapter('recipes');
const ingredientAdapter = createMemoryAdapter('ingredients');

// Create the stores using shared configuration
const stores = createDemoStores({
	recipes: recipeAdapter,
	ingredients: ingredientAdapter,
});

// Create context
const StoreContext = createContext(stores);

// Store provider component
export const StoreProvider: ParentComponent = (props) => {
	return (
		<StoreContext.Provider value={stores}>
			{props.children}
		</StoreContext.Provider>
	);
};

// Hook to access stores
export function useStores() {
	const context = useContext(StoreContext);
	if (!context) {
		throw new Error('useStores must be used within a StoreProvider');
	}
	return context;
}

// Hook to access a specific store
export function useStore<K extends keyof typeof stores>(key: K) {
	const stores = useStores();
	return stores[key];
}