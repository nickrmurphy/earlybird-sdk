import { HLC, generateHLC } from '../crdt';
import type {
	DatabaseConfig,
	StoreData,
	StoreDocument,
	StoreKey,
	StoreSchema,
	TypedDatabase,
} from '../types';

import type { IDB } from './db.types';
import { getHLC, openDatabase, putHLC, type DbContext } from './operations';
import {
	create as baseCreate,
	getHashes as baseGetHashes,
	merge as baseMerge,
	update as baseUpdate,
	getAll,
	getDocumentsInBuckets,
	getOne,
	getWhere,
} from './service';

export function createDB<TConfig extends DatabaseConfig>(
	config: TConfig,
): IDB<TConfig> {
	const dbPromise = openDatabase(config, 'hlc');
	let db: TypedDatabase<TConfig> | null = null;
	const hlcCache = new Map<StoreKey<TConfig>, HLC>();

	const getDb = async (): Promise<TypedDatabase<TConfig>> => {
		if (db) {
			return db;
		}
		db = await dbPromise;
		if (!db) {
			throw new Error('Database not initialized');
		}
		return db;
	};

	const getSchema = <TStoreName extends StoreKey<TConfig>>(
		storeName: TStoreName,
	): StoreSchema<TConfig, TStoreName> => {
		const schema = config.stores[storeName];
		if (!schema) {
			throw new Error(`Schema not found for store: ${storeName}`);
		}
		return schema as StoreSchema<TConfig, TStoreName>;
	};

	const getOrCreateHLC = async <TStoreName extends StoreKey<TConfig>>(
		db: TypedDatabase<TConfig>,
		storeName: TStoreName,
	) => {
		// Check if we already have an HLC for this store
		let hlc = hlcCache.get(storeName);

		if (!hlc) {
			// Load from database or generate new one
			const timestamp = (await getHLC({ db, storeName, hlcStoreName: 'hlc' })) || generateHLC();
			hlc = new HLC(undefined, undefined, timestamp);
			hlcCache.set(storeName, hlc);
		}

		return hlc;
	};

	return {
		get: async <TStoreName extends StoreKey<TConfig>>(
			storeName: TStoreName,
			id: string,
		) => {
			const db = await getDb();
			return getOne(
				{
					db,
					storeName,
				},
				id,
			);
		},
		all: async <TStoreName extends StoreKey<TConfig>>(
			storeName: TStoreName,
		) => {
			const db = await getDb();
			return getAll({
				db,
				storeName,
			});
		},
		where: async <TStoreName extends StoreKey<TConfig>>(
			storeName: TStoreName,
			predicate: (data: StoreData<TConfig, TStoreName>) => boolean,
		) => {
			const db = await getDb();
			return getWhere(
				{
					db,
					storeName,
				},
				predicate,
			);
		},
		create: async <TStoreName extends StoreKey<TConfig>>(
			storeName: TStoreName,
			data: StoreData<TConfig, TStoreName> | StoreData<TConfig, TStoreName>[],
		) => {
			const db = await getDb();
			const hlc = await getOrCreateHLC(db, storeName);
			await baseCreate(
				{
					db,
					storeName,
					hlc,
					schema: getSchema(storeName),
				},
				data,
			);
			await putHLC({ db, storeName, hlcStoreName: 'hlc' }, hlc.current());
		},
		update: async <TStoreName extends StoreKey<TConfig>>(
			storeName: TStoreName,
			data:
				| { id: string; data: Partial<StoreData<TConfig, TStoreName>> }
				| { id: string; data: Partial<StoreData<TConfig, TStoreName>> }[],
		) => {
			const db = await getDb();
			const hlc = await getOrCreateHLC(db, storeName);
			await baseUpdate(
				{
					db,
					storeName,
					hlc,
					schema: getSchema(storeName),
				},
				data,
			);
			await putHLC({ db, storeName, hlcStoreName: 'hlc' }, hlc.current());
		},
		getHashes: async <TStoreName extends StoreKey<TConfig>>(
			storeName: TStoreName,
			bucketSize?: number,
		) => {
			const db = await getDb();
			return baseGetHashes(
				{
					db,
					storeName,
				},
				bucketSize,
			);
		},
		getBuckets: async <TStoreName extends StoreKey<TConfig>>(
			storeName: TStoreName,
			buckets: number[],
			bucketSize?: number,
		) => {
			const db = await getDb();
			return getDocumentsInBuckets(
				{
					db,
					storeName,
				},
				buckets,
				bucketSize,
			);
		},
		merge: async <TStoreName extends StoreKey<TConfig>>(
			storeName: TStoreName,
			documents: StoreDocument<TConfig, TStoreName>[],
		) => {
			const db = await getDb();
			await baseMerge(
				{
					db,
					storeName,
				},
				documents,
			);
		},
	};
}
