import type { StandardSchemaV1 } from '../../standard-schema.types';
import type { StorageAdapter } from '../storage/types';
import type { Clock, HLC } from '../utils/hlc';

import { createClock } from '../utils/hlc';
import { mergeDocuments } from '../utils/merge';
import { deserializeFromCRDT, serializeToCRDT } from '../utils/serialize';
import { standardValidate } from '../utils/validate';

export type InferredValue<T extends StandardSchemaV1> =
	StandardSchemaV1.InferOutput<T>[keyof StandardSchemaV1.InferOutput<T>];

export type CRDTField<T extends StandardSchemaV1> = {
	_value: InferredValue<T>;
	_hlc: HLC;
};

export type CRDTDoc<T extends StandardSchemaV1> = {
	[path: string]: CRDTField<T>;
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
};

export function createStore<T extends StandardSchemaV1>(
	collection: string,
	config: { schema: T; adapter: StorageAdapter },
): Store<T> {
	const listeners = new Map<string, () => void>();

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

	const callListeners = () => {
		for (const listener of listeners.values()) {
			listener();
		}
	};

	return {
		all: async () => {
			if (!initialized) {
				await initialize();
			}

			if (!data) return null;

			const record: Record<string, StandardSchemaV1.InferOutput<T>> = {};
			for (const [id, doc] of Object.entries(data)) {
				const deserialized = deserializeFromCRDT(doc);
				const validated = standardValidate(config.schema, deserialized);
				record[id] = validated;
			}
			return record;
		},
		get: async (id: string) => {
			if (!initialized) {
				await initialize();
			}
			if (!data) return null;
			const doc = data[id];
			if (!doc) return null;
			const deserialized = deserializeFromCRDT(doc);
			const validated = standardValidate(config.schema, deserialized);
			return validated;
		},
		create: async (id: string, value: StandardSchemaV1.InferInput<T>) => {
			const validated = standardValidate(config.schema, value);

			if (!initialized) {
				await initialize();
			}

			if (!clock) throw new Error('Clock not initialized');
			const doc = serializeToCRDT(validated, clock);

			if (!data) {
				data = { [id]: doc };
			} else {
				data[id] = doc;
			}

			await config.adapter.saveData(JSON.stringify(data));
			callListeners();
		},
		createMany: async (
			payload: { id: string; value: StandardSchemaV1.InferInput<T> }[],
		) => {
			if (!initialized) {
				await initialize();
			}

			if (!clock) throw new Error('Clock not initialized');

			for (const { id, value } of payload) {
				const validated = standardValidate(config.schema, value);
				const doc = serializeToCRDT(validated, clock);

				if (!data) {
					data = { [id]: doc };
				} else {
					data[id] = doc;
				}
			}

			await config.adapter.saveData(JSON.stringify(data));
			callListeners();
		},
		update: async (
			id: string,
			value: Partial<StandardSchemaV1.InferInput<T>>,
		) => {
			if (!initialized) {
				await initialize();
			}

			if (!clock) throw new Error('Clock not initialized');

			if (!data) throw new Error('Data not initialized');

			const doc = data[id];

			if (!doc) throw new Error(`Document with id ${id} not found`);

			const current = deserializeFromCRDT(doc);
			const rawMerge: unknown = { ...(current as object), ...value };
			// assert updated doc is valid
			standardValidate(config.schema, rawMerge);

			// Merge with CRDTs
			const updates = serializeToCRDT<T>(value, clock);
			const mergedDoc = mergeDocuments<T>(doc, updates);
			data[id] = mergedDoc;

			await config.adapter.saveData(JSON.stringify(data));
			callListeners();
		},
		updateMany: async (
			payload: { id: string; value: Partial<StandardSchemaV1.InferInput<T>> }[],
		) => {
			if (!initialized) {
				await initialize();
			}

			if (!clock) throw new Error('Clock not initialized');

			if (!data) throw new Error('Data not initialized');

			for (const { id, value } of payload) {
				const doc = data[id];

				if (!doc) throw new Error(`Document with id ${id} not found`);

				const current = deserializeFromCRDT(doc);
				const rawMerge: unknown = { ...(current as object), ...value };
				// assert updated doc is valid
				standardValidate(config.schema, rawMerge);

				// Merge with CRDTs
				const updates = serializeToCRDT<T>(value, clock);
				const mergedDoc = mergeDocuments<T>(doc, updates);
				data[id] = mergedDoc;
			}

			await config.adapter.saveData(JSON.stringify(data));
			callListeners();
		},
		registerListener: (key: string, listener: () => void) => {
			listeners.set(key, listener);
		},
		unregisterListener: (key: string) => {
			listeners.delete(key);
		},
	};
}
