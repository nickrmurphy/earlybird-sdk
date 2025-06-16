export function createListeners() {
	const listeners = new Map<string, () => void>();

	const notifyListeners = () => {
		for (const listener of listeners.values()) {
			listener();
		}
	};

	return {
		notifyListeners,
		registerListener: (key: string, listener: () => void) => {
			listeners.set(key, listener);
		},
		unregisterListener: (key: string) => {
			listeners.delete(key);
		},
	};
}
