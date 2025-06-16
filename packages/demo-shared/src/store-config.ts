import type { StorageAdapter } from '@byearlybird/store';

import { createStore } from '@byearlybird/store';
import { ingredientSchema, recipeSchema } from './schema';

export interface StoreAdapters {
	recipes: StorageAdapter;
	ingredients: StorageAdapter;
}

export function createDemoStores(adapters: StoreAdapters) {
	const recipesStore = createStore('recipes', {
		adapter: adapters.recipes,
		schema: recipeSchema,
	});

	const ingredientsStore = createStore('ingredients', {
		adapter: adapters.ingredients,
		schema: ingredientSchema,
	});

	return {
		recipes: recipesStore,
		ingredients: ingredientsStore,
	} as const;
}

export type DemoStores = ReturnType<typeof createDemoStores>;
