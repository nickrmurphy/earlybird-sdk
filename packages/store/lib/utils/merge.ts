import type { StandardSchemaV1 } from '../../standard-schema.types';
import type { CRDTDoc, CRDTField } from '../store';
import { hashObject } from './hash';

export function mergeFields<T extends StandardSchemaV1>(
	a: CRDTField<T>,
	b: CRDTField<T>,
): CRDTField<T> {
	return a.$hlc > b.$hlc ? a : b;
}

export function mergeDocuments<T extends StandardSchemaV1>(
	a: CRDTDoc<T>,
	b: CRDTDoc<T>,
): CRDTDoc<T> {
	// Do a naiive merge to have a source of truth for paths
	const unionedValue = {
		...a.$value,
		...b.$value,
	};

	const mergedValue: {
		[path: string]: CRDTField<T>;
	} = {};

	for (const key of Object.keys(unionedValue)) {
		const aField = a.$value[key];
		const bField = b.$value[key];

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
		$value: mergedValue,
		$hash: hashObject(mergedValue),
	};
}
