
import type { DatabaseConfig, DocumentFromSchema, StandardSchemaV1, TypedDatabase } from '../types';

// biome-ignore lint/suspicious/noExplicitAny: Generic constraint requires any for StandardSchemaV1
const setUpStores = (db: IDBDatabase, stores: Record<string, StandardSchemaV1<any, any>>): void => {
    // Create object stores for each schema
    for (const [storeName] of Object.entries(stores)) {
        if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
                keyPath: '$id',
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

export async function openDatabase<TConfig extends DatabaseConfig>(config: TConfig): Promise<TypedDatabase<TConfig>> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(config.name, config.version);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            resolve(request.result as TypedDatabase<TConfig>);
        };

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

export async function addDocument<
    TConfig extends DatabaseConfig,
    TStoreName extends keyof TConfig['stores'] & string
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    document: DocumentFromSchema<TConfig['stores'][TStoreName]>
): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        const request = store.add(document);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getDocument<
    TConfig extends DatabaseConfig,
    TStoreName extends keyof TConfig['stores'] & string
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    id: string
): Promise<DocumentFromSchema<TConfig['stores'][TStoreName]> | null> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);

        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

export async function putDocument<
    TConfig extends DatabaseConfig,
    TStoreName extends keyof TConfig['stores'] & string
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    document: DocumentFromSchema<TConfig['stores'][TStoreName]>
): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        const request = store.put(document);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}