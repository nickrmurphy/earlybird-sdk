import type {
	DatabaseConfig,
	StoreDocument,
	StoreKey,
	TypedDatabase,
} from '../types';
import { mergeDocuments as mergeCRDTDocuments } from '../crdt/document/document';

export interface DbContext<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
> {
	db: TypedDatabase<TConfig>;
	storeName: TStoreName;
	hlcStoreName: string;
}

export function setUpStores<TConfig extends DatabaseConfig>(
	db: IDBDatabase,
	stores: TConfig['stores'],
	hlcStoreName: string,
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
				unique: false,
			});
			store.createIndex('$data', '$data', { unique: false });
		}
	}

	if (!db.objectStoreNames.contains(hlcStoreName)) {
		db.createObjectStore(hlcStoreName);
	}
}

export async function openDatabase<TConfig extends DatabaseConfig>(
	config: TConfig,
	hlcStoreName: string,
): Promise<TypedDatabase<TConfig>> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(config.name, config.version);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			resolve(request.result as TypedDatabase<TConfig>);
		};

		request.onupgradeneeded = (event) => {
			// Typecast is safe: IndexedDB spec guarantees this type
			const db = (event.target as IDBOpenDBRequest).result;

			setUpStores(db, config.stores, hlcStoreName);
		};
	});
}

export async function addDocument<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	document: StoreDocument<TConfig, TStoreName>,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readwrite');
		const store = transaction.objectStore(context.storeName);

		const request = store.add(document);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function addDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	documents: StoreDocument<TConfig, TStoreName>[],
): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readwrite');
		const store = transaction.objectStore(context.storeName);

		Promise.all(
			documents.map(
				(doc) =>
					new Promise<void>((res, rej) => {
						const request = store.add(doc);
						request.onsuccess = () => res();
						request.onerror = () => rej(request.error);
					}),
			),
		)
			.then(() => resolve())
			.catch(reject);
	});
}

export async function getDocument<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	id: string,
): Promise<StoreDocument<TConfig, TStoreName> | null> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readonly');
		const store = transaction.objectStore(context.storeName);

		const request = store.get(id);

		request.onsuccess = () => resolve(request.result || null);
		request.onerror = () => reject(request.error);
	});
}

export async function getAllDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
): Promise<StoreDocument<TConfig, TStoreName>[]> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readonly');
		const store = transaction.objectStore(context.storeName);

		const request = store.getAll();

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function putDocument<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	document: StoreDocument<TConfig, TStoreName>,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readwrite');
		const store = transaction.objectStore(context.storeName);

		const request = store.put(document);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function putDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	documents: StoreDocument<TConfig, TStoreName>[],
): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readwrite');
		const store = transaction.objectStore(context.storeName);

		Promise.all(
			documents.map(
				(doc) =>
					new Promise<void>((res, rej) => {
						const request = store.put(doc);
						request.onsuccess = () => res();
						request.onerror = () => rej(request.error);
					}),
			),
		)
			.then(() => resolve())
			.catch(reject);
	});
}

export async function queryDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	predicate: (data: StoreDocument<TConfig, TStoreName>['$data']) => boolean,
): Promise<StoreDocument<TConfig, TStoreName>[]> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readonly');
		const store = transaction.objectStore(context.storeName);
		const results: StoreDocument<TConfig, TStoreName>[] = [];
		const request = store.openCursor();

		request.onsuccess = (event) => {
			const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
			if (cursor) {
				const doc = cursor.value as StoreDocument<TConfig, TStoreName>;
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

export async function putHLC<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	timestamp: string,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.hlcStoreName, 'readwrite');
		const store = transaction.objectStore(context.hlcStoreName);

		const request = store.put(timestamp, context.storeName);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function getHLC<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
): Promise<string | null> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.hlcStoreName, 'readonly');
		const store = transaction.objectStore(context.hlcStoreName);

		const request = store.get(context.storeName);

		request.onsuccess = () => resolve(request.result || null);
		request.onerror = () => reject(request.error);
	});
}

export async function mergeDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	documents: StoreDocument<TConfig, TStoreName>[],
): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readwrite');
		const store = transaction.objectStore(context.storeName);

		let processedCount = 0;
		const totalCount = documents.length;

		if (totalCount === 0) {
			resolve();
			return;
		}

		const processDocument = (doc: StoreDocument<TConfig, TStoreName>) => {
			const getRequest = store.get(doc.$id);

			getRequest.onsuccess = () => {
				const existingDoc = getRequest.result;
				let finalDoc: StoreDocument<TConfig, TStoreName>;

				if (existingDoc) {
					finalDoc = mergeCRDTDocuments(existingDoc, doc) as StoreDocument<
						TConfig,
						TStoreName
					>;
				} else {
					finalDoc = doc;
				}

				const putRequest = store.put(finalDoc);

				putRequest.onsuccess = () => {
					processedCount++;
					if (processedCount === totalCount) {
						resolve();
					}
				};

				putRequest.onerror = () => reject(putRequest.error);
			};

			getRequest.onerror = () => reject(getRequest.error);
		};

		documents.forEach(processDocument);
	});
}
