import type { StandardSchemaV1 } from '../../store/schema.types';
import type { CRDTDoc } from '../store';
import type { Clock } from './hlc';

import { flatten, unflatten } from './flatten';
import { unwrapObject, wrapObject } from './wrap';

export function serializeToCRDT<T extends StandardSchemaV1>(
	data: StandardSchemaV1.InferInput<T>,
	clock: Clock,
): CRDTDoc<T> {
	if (typeof data !== 'object' || Array.isArray(data) || data === null) {
		throw new Error('Invalid data type');
	}

	const flattened = flatten(data);
	const wrapped = wrapObject<T>(flattened, clock);
	return wrapped;
}

export function deserializeFromCRDT<T extends StandardSchemaV1>(
	data: CRDTDoc<T>,
): StandardSchemaV1.InferOutput<T> {
	const unwrapped = unwrapObject<T>(data);
	const unflattened = unflatten(unwrapped);
	return unflattened;
}
