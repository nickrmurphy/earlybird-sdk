import type { StorageAdapter } from './types';

import { createListeners } from '../utils/listeners';

export function createMemoryAdapter(): StorageAdapter {
	const data = new Map<'hlc' | 'data', string>();
	const { notifyListeners, registerListener, unregisterListener } =
		createListeners();

	return {
		loadData: async () => {
			return Promise.resolve(data.get('data') ?? null);
		},
		saveData: async (value: string) => {
			data.set('data', value);
			notifyListeners();
			return Promise.resolve();
		},
		loadHLC: async () => {
			return Promise.resolve(data.get('hlc') ?? null);
		},
		saveHLC: async (value: string) => {
			data.set('hlc', value);
			return Promise.resolve();
		},
		registerListener,
		unregisterListener,
	};
}
