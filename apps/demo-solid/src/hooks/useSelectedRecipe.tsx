import { useSessionStorage } from './useSessionStorage';

export function useSelectedRecipe() {
	return useSessionStorage<string | null>('selectedRecipe', null);
}