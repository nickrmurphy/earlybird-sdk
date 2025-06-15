import type { StandardSchemaV1 } from '../store/schema.types';
import type { StorageAdapter } from './storage/types';
import type { HLC } from './utils/hlc';

import { deserializeFromCRDT } from './utils/serialize';
import { standardValidate } from './utils/validate';

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

type Store<T extends StandardSchemaV1> = {
	all: () => Promise<{ [key: string]: StandardSchemaV1.InferOutput<T> } | null>;
};

export function createStore<T extends StandardSchemaV1>(
	collection: string,
	config: { schema: T; adapter: StorageAdapter },
): Store<T> {
	let initialized = false;
	let data: CRDTStore<T> | null = null;

	const initialize = async () => {
		const raw = await config.adapter.loadData();
		if (!raw) return null;
		data = JSON.parse(raw) as CRDTStore<T>;
		initialized = true;
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
			return Promise.resolve(record);
		},
	};
}
