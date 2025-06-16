import type { StorageAdapter } from './types';

export function createMemoryAdapter(): StorageAdapter {
	const data = new Map<'hlc' | 'data', string>();
	const listeners = new Map<string, () => void>();

	const notifyListeners = () => {
		for (const listener of listeners.values()) {
			listener();
		}
	};

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
		registerListener: (id: string, listener: () => void) => {
			listeners.set(id, listener);
		},
		unregisterListener: (id: string) => {
			listeners.delete(id);
		},
	};
}
