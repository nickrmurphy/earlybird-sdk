import type { DatabaseConfig, DocumentFromSchema, StandardSchemaV1, TypedDatabase } from '../types';

export function setUpStores<TConfig extends DatabaseConfig>(
    db: IDBDatabase,
    stores: TConfig['stores']
): void {
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
            // Typecast is safe: IndexedDB spec guarantees this type
            const db = (event.target as IDBOpenDBRequest).result;

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

export async function addDocuments<
    TConfig extends DatabaseConfig,
    TStoreName extends keyof TConfig['stores'] & string
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    documents: DocumentFromSchema<TConfig['stores'][TStoreName]>[]
): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        Promise.all(
            documents.map(doc =>
                new Promise<void>((res, rej) => {
                    const request = store.add(doc);
                    request.onsuccess = () => res();
                    request.onerror = () => rej(request.error);
                }))
        )
            .then(() => resolve())
            .catch(reject);
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

export async function getAllDocuments<
    TConfig extends DatabaseConfig,
    TStoreName extends keyof TConfig['stores'] & string
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName
): Promise<DocumentFromSchema<TConfig['stores'][TStoreName]>[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);

        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
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

export async function putDocuments<
    TConfig extends DatabaseConfig,
    TStoreName extends keyof TConfig['stores'] & string
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    documents: DocumentFromSchema<TConfig['stores'][TStoreName]>[]
): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        Promise.all(
            documents.map(doc =>
                new Promise<void>((res, rej) => {
                    const request = store.put(doc);
                    request.onsuccess = () => res();
                    request.onerror = () => rej(request.error);
                })
            )
        )
            .then(() => resolve())
            .catch(reject);
    });
}

export async function queryDocuments<
    TConfig extends DatabaseConfig,
    TStoreName extends keyof TConfig['stores'] & string
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    predicate: (data: DocumentFromSchema<TConfig['stores'][TStoreName]>['$data']) => boolean
): Promise<DocumentFromSchema<TConfig['stores'][TStoreName]>[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const results: DocumentFromSchema<TConfig['stores'][TStoreName]>[] = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
                const doc = cursor.value as DocumentFromSchema<TConfig['stores'][TStoreName]>;
                if (predicate(doc.$data)) {
                    results.push(doc);
                }
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        request.onerror = () => reject(request.error);
    });
}


