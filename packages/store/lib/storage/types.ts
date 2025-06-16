export type StorageAdapter = {
	loadData: () => Promise<string | null>;
	saveData: (data: string) => Promise<void>;
	loadHLC: () => Promise<string | null>;
	saveHLC: (data: string) => Promise<void>;
	registerListener: (key: string, listener: () => void) => void;
	unregisterListener: (key: string) => void;
};
