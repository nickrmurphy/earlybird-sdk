import type { StandardSchemaV1 } from '../store/schema.types';
import type { HLC } from './utils/hlc';

export type CRDTField<T extends StandardSchemaV1> = {
	_value: StandardSchemaV1.InferOutput<T>;
	_hlc: HLC;
};

export type CRDTDoc<T extends StandardSchemaV1> = {
	[path: string]: CRDTField<T>;
};
