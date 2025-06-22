export interface IoContext {
	db: IDBDatabase;
	storeName: string;
}

export async function openDB(
	name: string,
	version: number,
	onUpgradeNeeded: (db: IDBDatabase, event: IDBVersionChangeEvent) => void,
): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(name, version);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			onUpgradeNeeded(db, event);
		};
	});
}

export async function get<T>(
	context: IoContext,
	key: string,
): Promise<T | null> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readonly');
		const store = transaction.objectStore(context.storeName);

		const request = store.get(key);

		request.onsuccess = () => resolve(request.result || null);
		request.onerror = () => reject(request.error);
	});
}

export async function getAll<T>(context: IoContext): Promise<T[]> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readonly');
		const store = transaction.objectStore(context.storeName);

		const request = store.getAll();

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export async function put<T>(context: IoContext, item: T): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readwrite');
		const store = transaction.objectStore(context.storeName);

		const request = store.put(item);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function putAll<T>(
	context: IoContext,
	items: T[],
): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readwrite');
		const store = transaction.objectStore(context.storeName);

		Promise.all(
			items.map(
				(item) =>
					new Promise<void>((res, rej) => {
						const request = store.put(item);
						request.onsuccess = () => res();
						request.onerror = () => rej(request.error);
					}),
			),
		)
			.then(() => resolve())
			.catch(reject);
	});
}

export async function add<T>(context: IoContext, item: T): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readwrite');
		const store = transaction.objectStore(context.storeName);

		const request = store.add(item);

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function addAll<T>(
	context: IoContext,
	items: T[],
): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readwrite');
		const store = transaction.objectStore(context.storeName);

		Promise.all(
			items.map(
				(item) =>
					new Promise<void>((res, rej) => {
						const request = store.add(item);
						request.onsuccess = () => res();
						request.onerror = () => rej(request.error);
					}),
			),
		)
			.then(() => resolve())
			.catch(reject);
	});
}

export async function query<T>(
	context: IoContext,
	predicate: (item: T) => boolean,
): Promise<T[]> {
	return new Promise((resolve, reject) => {
		const transaction = context.db.transaction(context.storeName, 'readonly');
		const store = transaction.objectStore(context.storeName);
		const results: T[] = [];
		const request = store.openCursor();

		request.onsuccess = (event) => {
			const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
			if (cursor) {
				const item = cursor.value as T;
				if (predicate(item)) {
					results.push(item);
				}
				cursor.continue();
			} else {
				resolve(results);
			}
		};
		request.onerror = () => reject(request.error);
	});
}