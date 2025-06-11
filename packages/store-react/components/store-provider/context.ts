import { createContext } from 'react';
import type { StoreRegistry } from '../../types';

export function createStoreContext<T extends StoreRegistry>() {
	return createContext<T | null>(null);
}
