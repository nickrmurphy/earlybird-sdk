import type { StorageAdapter } from './types';

import { createListeners } from '../utils/listeners';

export type IndexedDBAdapterConfig = {
	databaseName?: string;
	version?: number;
};

const DEFAULT_DATABASE_NAME = 'earlybird_store';
const DEFAULT_VERSION = 1;
const DATA_STORE_NAME = 'data';
const HLC_STORE_NAME = 'hlc';

// Promise wrapper for IndexedDB operations
const openDatabase = (
	databaseName: string,
	version: number,
): Promise<IDBDatabase> => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(databaseName, version);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create data store if it doesn't exist
			if (!db.objectStoreNames.contains(DATA_STORE_NAME)) {
				db.createObjectStore(DATA_STORE_NAME, { keyPath: 'collection' });
			}

			// Create HLC store if it doesn't exist
			if (!db.objectStoreNames.contains(HLC_STORE_NAME)) {
				db.createObjectStore(HLC_STORE_NAME, { keyPath: 'collection' });
			}
		};
	});
};

const getFromStore = (
	db: IDBDatabase,
	storeName: string,
	key: string,
): Promise<string | null> => {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([storeName], 'readonly');
		const store = transaction.objectStore(storeName);
		const request = store.get(key);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			const result = request.result;
			resolve(result ? result.content : null);
		};
	});
};

const putToStore = (
	db: IDBDatabase,
	storeName: string,
	key: string,
	value: string,
): Promise<void> => {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([storeName], 'readwrite');
		const store = transaction.objectStore(storeName);
		const request = store.put({ collection: key, content: value });

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve();
	});
};

export function createIndexedDBAdapter(
	collection: string,
	config?: IndexedDBAdapterConfig,
): StorageAdapter {
	const { notifyListeners, registerListener, unregisterListener } =
		createListeners();

	const databaseName = config?.databaseName ?? DEFAULT_DATABASE_NAME;
	const version = config?.version ?? DEFAULT_VERSION;

	// Cache the database connection
	let dbPromise: Promise<IDBDatabase> | null = null;

	const getDatabase = (): Promise<IDBDatabase> => {
		if (!dbPromise) {
			dbPromise = openDatabase(databaseName, version);
		}
		return dbPromise;
	};

	return {
		loadData: async () => {
			const db = await getDatabase();
			return getFromStore(db, DATA_STORE_NAME, collection);
		},

		saveData: async (data: string) => {
			const db = await getDatabase();
			await putToStore(db, DATA_STORE_NAME, collection, data);
			notifyListeners();
		},

		loadHLC: async () => {
			const db = await getDatabase();
			return getFromStore(db, HLC_STORE_NAME, collection);
		},

		saveHLC: async (data: string) => {
			const db = await getDatabase();
			await putToStore(db, HLC_STORE_NAME, collection, data);
		},

		registerListener,
		unregisterListener,
	};
}