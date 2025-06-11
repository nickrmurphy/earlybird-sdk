import type React from 'react';
import type { StoreProviderProps, StoreRegistry } from '../../types';

export function createStoreProvider<T extends StoreRegistry>(
	StoreContext: React.Context<T | null>,
) {
	const StoreProvider: React.FC<StoreProviderProps<T>> = ({
		stores,
		children,
	}) => {
		return (
			<StoreContext.Provider value={stores}>{children}</StoreContext.Provider>
		);
	};

	return StoreProvider;
}
