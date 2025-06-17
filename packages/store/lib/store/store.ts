import type { StandardSchemaV1 } from '../../standard-schema.types';
import type { Clock, HLC } from '../crdt/hlc';
import type { StorageAdapter } from '../storage/types';

import { createClock } from '../crdt/hlc';
import {
	createDocumentOperation,
	deserializeDocumentOperation,
	deserializeStoreOperation,
	mergeStoreOperation,
	updateDocumentOperation,
	validateDocumentExists,
} from './store-operations';

export type InferredValue<T extends StandardSchemaV1> =
	StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>];

export type CRDTField<T extends StandardSchemaV1> = {
	$value: InferredValue<T>;
	$hlc: HLC;
};

export type CRDTDoc<T extends StandardSchemaV1> = {
	$value: {
		[path: string]: CRDTField<T>;
	};
	$hash: string;
	$hlc: string;
};

export type CRDTStore<T extends StandardSchemaV1> = {
	[id: string]: CRDTDoc<T>;
};

export type Store<T extends StandardSchemaV1> = {
	all: () => Promise<{ [key: string]: StandardSchemaV1.InferOutput<T> } | null>;
	get: (id: string) => Promise<StandardSchemaV1.InferOutput<T> | null>;
	create: (id: string, value: StandardSchemaV1.InferInput<T>) => Promise<void>;
	createMany: (
		payload: { id: string; value: StandardSchemaV1.InferInput<T> }[],
	) => Promise<void>;
	update: (
		id: string,
		value: Partial<StandardSchemaV1.InferInput<T>>,
	) => Promise<void>;
	updateMany: (
		payload: { id: string; value: Partial<StandardSchemaV1.InferInput<T>> }[],
	) => Promise<void>;
	registerListener: (key: string, callback: () => void) => void;
	unregisterListener: (key: string) => void;
	getHashes: () => Promise<string[]>;
	merge: (store: CRDTStore<T>) => Promise<void>;
};

export function createStore<T extends StandardSchemaV1>(
	collection: string,
	config: { schema: T; adapter: StorageAdapter },
): Store<T> {
	const ERRORS = {
		STORE_NOT_INITIALIZED: 'Store not initialized',
		CLOCK_NOT_INITIALIZED: 'Clock not initialized',
		DATA_NOT_INITIALIZED: 'Data not initialized',
		DOCUMENT_NOT_FOUND: (id: string) => `Document with id ${id} not found`,
	} as const;
	let initialized = false;
	let data: CRDTStore<T> | null = null;
	let clock: Clock | null = null;

	const initialize = async () => {
		const rawData = await config.adapter.loadData();
		if (rawData) {
			data = JSON.parse(rawData) as CRDTStore<T>;
		}
		const hlc = (await config.adapter.loadHLC()) as HLC | null;
		clock = hlc ? createClock(hlc) : createClock();
		initialized = true;
	};

	const saveChanges = async () => {
		if (clock) await config.adapter.saveHLC(clock.current());
		await config.adapter.saveData(JSON.stringify(data));
	};

	const ensureReady = async <TNeedsData extends boolean = false>(
		needsData?: TNeedsData,
	): Promise<
		TNeedsData extends true
			? { clock: Clock; data: CRDTStore<T> }
			: { clock: Clock }
	> => {
		if (!initialized) await initialize();
		if (!clock) throw new Error(ERRORS.CLOCK_NOT_INITIALIZED);

		if (needsData) {
			// For empty stores, data will be null, which is valid - initialize to empty object
			const storeData = data || {};
			return { clock, data: storeData } as TNeedsData extends true
				? { clock: Clock; data: CRDTStore<T> }
				: { clock: Clock };
		}

		return { clock } as TNeedsData extends true
			? { clock: Clock; data: CRDTStore<T> }
			: { clock: Clock };
	};

	const setDocumentInStore = (id: string, doc: CRDTDoc<T>) => {
		if (!data) {
			data = { [id]: doc };
		} else {
			data[id] = doc;
		}
	};

	return {
		all: async () => {
			await ensureReady();

			if (!data) return null;

			const result = deserializeStoreOperation(config.schema, data);
			if (!result.success) {
				throw new Error(result.error.message);
			}
			return result.data;
		},
		get: async (id: string) => {
			await ensureReady();
			if (!data) return null;
			const doc = data[id];
			if (!doc) return null;

			const result = deserializeDocumentOperation(config.schema, doc);
			if (!result.success) {
				throw new Error(result.error.message);
			}
			return result.data;
		},
		create: async (id: string, value: StandardSchemaV1.InferInput<T>) => {
			const { clock } = await ensureReady();

			const result = createDocumentOperation(config.schema, value, clock);
			if (!result.success) {
				throw new Error(result.error.message);
			}

			setDocumentInStore(id, result.data);
			await saveChanges();
		},
		createMany: async (
			payload: { id: string; value: StandardSchemaV1.InferInput<T> }[],
		) => {
			const { clock } = await ensureReady();

			for (const { id, value } of payload) {
				const result = createDocumentOperation(config.schema, value, clock);
				if (!result.success) {
					throw new Error(result.error.message);
				}
				setDocumentInStore(id, result.data);
			}

			await saveChanges();
		},
		update: async (
			id: string,
			value: Partial<StandardSchemaV1.InferInput<T>>,
		) => {
			const { clock, data: storeData } = await ensureReady(true);

			const docResult = validateDocumentExists(storeData, id);
			if (!docResult.success) {
				throw new Error(docResult.error.message);
			}

			const updateResult = updateDocumentOperation(
				config.schema,
				docResult.data,
				value,
				clock,
			);
			if (!updateResult.success) {
				throw new Error(updateResult.error.message);
			}

			storeData[id] = updateResult.data;
			await saveChanges();
		},
		updateMany: async (
			payload: { id: string; value: Partial<StandardSchemaV1.InferInput<T>> }[],
		) => {
			const { clock, data: storeData } = await ensureReady(true);

			for (const { id, value } of payload) {
				const docResult = validateDocumentExists(storeData, id);
				if (!docResult.success) {
					throw new Error(docResult.error.message);
				}

				const updateResult = updateDocumentOperation(
					config.schema,
					docResult.data,
					value,
					clock,
				);
				if (!updateResult.success) {
					throw new Error(updateResult.error.message);
				}

				storeData[id] = updateResult.data;
			}

			await saveChanges();
		},
		registerListener: (key: string, listener: () => void) => {
			config.adapter.registerListener(key, listener);
		},
		unregisterListener: (key: string) => {
			config.adapter.unregisterListener(key);
		},
		getHashes: async () => {
			const { data: storeData } = await ensureReady(true);
			return Object.values(storeData).map((doc) => doc.$hash);
		},
		merge: async (store) => {
			await ensureReady(true);

			// Initialize data if it's null (empty store)
			if (!data) {
				data = {};
			}

			// Use pure merge operation
			data = mergeStoreOperation(data, store);

			await saveChanges();
		},
	};
}
