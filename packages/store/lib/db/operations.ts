
import type { DatabaseConfig, StandardSchemaV1 } from '../types';

// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any for StandardSchemaV1
const setUpStores = (db: IDBDatabase, stores: Record<string, StandardSchemaV1<any, any>>): void => {
    // Create object stores for each schema
    for (const [storeName] of Object.entries(stores)) {
        if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
                keyPath: '$id'
            });

            // Create indexes for common CRDT fields
            store.createIndex('$hash', '$hash', { unique: false });
            store.createIndex('$timestamps', '$timestamps', {
                unique: false
            });
            store.createIndex('$data', '$data', { unique: false });
        }
    }
};

export async function openDatabase(config: DatabaseConfig): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(config.name, config.version);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            if (!(event.target instanceof IDBOpenDBRequest)) {
                reject(new Error('Invalid event target'));
                return;
            }

            const db = event.target.result;

            setUpStores(db, config.stores);
        };
    });
}

