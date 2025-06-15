import type { StandardSchemaV1 } from '../../store/schema.types';
import type { CRDTDoc, CRDTField } from '../store';

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
	const unionedDoc: CRDTDoc<T> = {
		...a,
		...b,
	};

	const mergedDoc: CRDTDoc<T> = {};

	for (const key of Object.keys(unionedDoc)) {
		const aField = a[key];
		const bField = b[key];

		if (!aField && bField) {
			mergedDoc[key] = bField;
			continue;
		}

		if (!bField && aField) {
			mergedDoc[key] = aField;
			continue;
		}

		if (!bField && !aField) {
			console.warn(`Missing fields during merge for key ${key}`);
			continue;
		}

		if (!bField || !aField) {
			continue;
		}

		mergedDoc[key] = mergeFields(aField, bField);
	}

	return mergedDoc;
}
