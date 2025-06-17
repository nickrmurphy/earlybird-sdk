import type { StandardSchemaV1 } from '../../standard-schema.types';
import type { CRDTDoc, CRDTField, InferredValue } from '../store';
import type { Clock } from './hlc';

import { hashObject } from '../utils/hash';

export function wrapField<T extends StandardSchemaV1>(
	data: InferredValue<T>,
	clock: Clock,
): CRDTField<T> {
	return {
		$value: data,
		$hlc: clock.tick(),
	};
}

export function wrapDoc<T extends StandardSchemaV1>(
	data: { [key: string]: InferredValue<T> },
	clock: Clock,
): CRDTDoc<T> {
	const docValue: { [key: string]: CRDTField<T> } = {};

	for (const [key, value] of Object.entries(data)) {
		docValue[key] = wrapField(value, clock);
	}

	return {
		$value: docValue,
		$hlc: clock.tick(),
		$hash: hashObject(docValue),
	};
}

export function unwrapField<T extends StandardSchemaV1>(
	field: CRDTField<T>,
): InferredValue<T> {
	return field.$value;
}

export function unwrapDoc<T extends StandardSchemaV1>(
	doc: CRDTDoc<T>,
): { [key: string]: StandardSchemaV1.InferOutput<T> } {
	const data: { [key: string]: StandardSchemaV1.InferOutput<T> } = {};

	for (const [key, field] of Object.entries(doc.$value)) {
		data[key] = unwrapField(field);
	}

	return data;
}
