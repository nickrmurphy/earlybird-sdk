import type { StandardSchemaV1 } from '../../standard-schema.types';
import type { CRDTDoc, CRDTField, InferredValue } from '../store';
import type { Clock } from './hlc';

export function wrap<T extends StandardSchemaV1>(
	data: InferredValue<T>,
	clock: Clock,
): CRDTField<T> {
	return {
		_value: data,
		_hlc: clock.tick(),
	};
}

export function wrapObject<T extends StandardSchemaV1>(
	data: { [key: string]: InferredValue<T> },
	clock: Clock,
): CRDTDoc<T> {
	const doc: { [key: string]: CRDTField<T> } = {};

	for (const [key, value] of Object.entries(data)) {
		doc[key] = wrap(value, clock);
	}

	return doc;
}

export function unwrap<T extends StandardSchemaV1>(
	field: CRDTField<T>,
): InferredValue<T> {
	return field._value;
}

export function unwrapObject<T extends StandardSchemaV1>(
	doc: CRDTDoc<T>,
): { [key: string]: StandardSchemaV1.InferOutput<T> } {
	const data: { [key: string]: StandardSchemaV1.InferOutput<T> } = {};

	for (const [key, field] of Object.entries(doc)) {
		data[key] = unwrap(field);
	}

	return data;
}
