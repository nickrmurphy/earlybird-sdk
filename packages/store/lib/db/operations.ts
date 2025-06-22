import { mergeDocuments as mergeCRDTDocuments } from '../crdt/document/document';
import type {
	DatabaseConfig,
	StoreDocument,
	StoreKey,
	TypedDatabase,
} from '../types';
import {
	type IoContext,
	add,
	addAll,
	get,
	getAll,
	openDB,
	put,
	putAll,
	putWithKey,
	query,
} from './store-io/store-io';

export interface DbContext<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
> {
	db: TypedDatabase<TConfig>;
	storeName: TStoreName;
	hlcStoreName: string;
}

function createIoContext<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(context: DbContext<TConfig, TStoreName>): IoContext {
	return {
		db: context.db,
		storeName: context.storeName,
	};
}

function createHlcIoContext<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(context: DbContext<TConfig, TStoreName>): IoContext {
	return {
		db: context.db,
		storeName: context.hlcStoreName,
	};
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
	const db = await openDB(config.name, config.version, (db) => {
		setUpStores(db, config.stores, hlcStoreName);
	});
	return db as TypedDatabase<TConfig>;
}

export async function addDocument<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	document: StoreDocument<TConfig, TStoreName>,
): Promise<void> {
	return add(createIoContext(context), document);
}

export async function addDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	documents: StoreDocument<TConfig, TStoreName>[],
): Promise<void> {
	return addAll(createIoContext(context), documents);
}

export async function getDocument<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	id: string,
): Promise<StoreDocument<TConfig, TStoreName> | null> {
	return get<StoreDocument<TConfig, TStoreName>>(createIoContext(context), id);
}

export async function getAllDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
): Promise<StoreDocument<TConfig, TStoreName>[]> {
	return getAll<StoreDocument<TConfig, TStoreName>>(createIoContext(context));
}

export async function putDocument<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	document: StoreDocument<TConfig, TStoreName>,
): Promise<void> {
	return put(createIoContext(context), document);
}

export async function putDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	documents: StoreDocument<TConfig, TStoreName>[],
): Promise<void> {
	return putAll(createIoContext(context), documents);
}

export async function queryDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	predicate: (data: StoreDocument<TConfig, TStoreName>['$data']) => boolean,
): Promise<StoreDocument<TConfig, TStoreName>[]> {
	return query<StoreDocument<TConfig, TStoreName>>(
		createIoContext(context),
		(doc) => predicate(doc.$data),
	);
}

export async function putHLC<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(context: DbContext<TConfig, TStoreName>, timestamp: string): Promise<void> {
	return putWithKey(createHlcIoContext(context), timestamp, context.storeName);
}

export async function getHLC<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(context: DbContext<TConfig, TStoreName>): Promise<string | null> {
	return get<string>(createHlcIoContext(context), context.storeName);
}

export async function mergeDocuments<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	context: DbContext<TConfig, TStoreName>,
	documents: StoreDocument<TConfig, TStoreName>[],
): Promise<void> {
	if (documents.length === 0) {
		return;
	}

	const ioContext = createIoContext(context);
	const mergedDocs: StoreDocument<TConfig, TStoreName>[] = [];

	for (const doc of documents) {
		const existingDoc = await get<StoreDocument<TConfig, TStoreName>>(
			ioContext,
			doc.$id,
		);
		let finalDoc: StoreDocument<TConfig, TStoreName>;

		if (existingDoc) {
			finalDoc = mergeCRDTDocuments(existingDoc, doc) as StoreDocument<
				TConfig,
				TStoreName
			>;
		} else {
			finalDoc = doc;
		}

		mergedDocs.push(finalDoc);
	}

	await putAll(ioContext, mergedDocs);
}
