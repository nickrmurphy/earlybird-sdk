import type {
	DatabaseConfig,
	StoreKey,
	StoreData,
	StoreDocument,
} from '../types';

export interface IDB<TConfig extends DatabaseConfig> {
	get<TStoreName extends StoreKey<TConfig>>(
		storeName: TStoreName,
		id: string,
	): Promise<StoreData<TConfig, TStoreName> | null>;

	all<TStoreName extends StoreKey<TConfig>>(
		storeName: TStoreName,
	): Promise<StoreData<TConfig, TStoreName>[]>;

	where<TStoreName extends StoreKey<TConfig>>(
		storeName: TStoreName,
		predicate: (data: StoreData<TConfig, TStoreName>) => boolean,
	): Promise<StoreData<TConfig, TStoreName>[]>;

	create<TStoreName extends StoreKey<TConfig>>(
		storeName: TStoreName,
		data: StoreData<TConfig, TStoreName> | StoreData<TConfig, TStoreName>[],
	): Promise<void>;

	update<TStoreName extends StoreKey<TConfig>>(
		storeName: TStoreName,
		data:
			| { id: string; data: Partial<StoreData<TConfig, TStoreName>> }
			| { id: string; data: Partial<StoreData<TConfig, TStoreName>> }[],
	): Promise<void>;

	getHashes<TStoreName extends StoreKey<TConfig>>(
		storeName: TStoreName,
		bucketSize?: number,
	): Promise<{ root: string; buckets: Record<number, string> }>;

	getBuckets<TStoreName extends StoreKey<TConfig>>(
		storeName: TStoreName,
		buckets: number[],
		bucketSize?: number,
	): Promise<StoreDocument<TConfig, TStoreName>[]>;
}
