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
