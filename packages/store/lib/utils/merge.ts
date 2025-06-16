import type { StandardSchemaV1 } from '../../standard-schema.types';
import type { CRDTDoc, CRDTField } from '../store';
import { hashObject } from './hash';

export function mergeFields<T extends StandardSchemaV1>(
	a: CRDTField<T>,
	b: CRDTField<T>,
): CRDTField<T> {
	return a._hlc > b._hlc ? a : b;
}

export function mergeDocuments<T extends StandardSchemaV1>(
	a: CRDTDoc<T>,
	b: CRDTDoc<T>,
): CRDTDoc<T> {
	// Do a naiive merge to have a source of truth for paths
	const unionedValue = {
		...a._value,
		...b._value,
	};

	const mergedValue: {
		[path: string]: CRDTField<T>;
	} = {};

	for (const key of Object.keys(unionedValue)) {
		const aField = a._value[key];
		const bField = b._value[key];

		if (!aField && bField) {
			mergedValue[key] = bField;
			continue;
		}

		if (!bField && aField) {
			mergedValue[key] = aField;
			continue;
		}

		if (!bField && !aField) {
			console.warn(`Missing fields during merge for key ${key}`);
			continue;
		}

		if (!bField || !aField) {
			continue;
		}

		mergedValue[key] = mergeFields(aField, bField);
	}

	return {
		_value: mergedValue,
		_hash: hashObject(mergedValue),
	};
}
