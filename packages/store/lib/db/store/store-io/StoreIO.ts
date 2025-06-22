import {
	add,
	addAll,
	get,
	getAll,
	put,
	putAll,
	putWithKey,
	query,
	type IoContext,
} from './store-io';

export class StoreIO {
	constructor(private context: IoContext) {}

	async add<T>(item: T): Promise<void> {
		await add<T>(this.context, item);
	}

	async addAll<T>(items: T[]): Promise<void> {
		await addAll<T>(this.context, items);
	}

	async get<T>(id: string): Promise<T | null> {
		return await get<T>(this.context, id);
	}

	async getAll<T>(): Promise<T[]> {
		return await getAll<T>(this.context);
	}

	async put<T>(item: T): Promise<void> {
		await put<T>(this.context, item);
	}

	async putAll<T>(items: T[]): Promise<void> {
		await putAll<T>(this.context, items);
	}

	async putWithKey<T>(item: T, key: string): Promise<void> {
		await putWithKey<T>(this.context, item, key);
	}

	async query<T>(predicate: (item: T) => boolean): Promise<T[]> {
		return await query<T>(this.context, predicate);
	}
}
