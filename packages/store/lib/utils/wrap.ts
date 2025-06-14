import type { StandardSchemaV1 } from '../../store/schema.types';
import type { CRDTDocument } from '../store';

import { generateHLC } from './hlc';

export function wrap<T extends StandardSchemaV1>(
	obj: StandardSchemaV1.InferOutput<T>,
): CRDTDocument<T> {
	const crdtDoc: CRDTDocument<T> = {};

	if (typeof obj !== 'object' || Array.isArray(obj)) {
		throw new Error('Invalid object. Wrappable objects must be plain objects.');
	}

	for (const [path, value] of Object.entries(obj as Record<string, unknown>)) {
		crdtDoc[path] = {
			_value: value,
			_hlc: generateHLC(),
		};
	}

	return crdtDoc;
}
