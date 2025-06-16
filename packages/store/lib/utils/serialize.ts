import type { StandardSchemaV1 } from '../../standard-schema.types';
import type { CRDTDoc } from '../store';
import { flatten, unflatten } from './flatten';
import type { Clock } from './hlc';
import { unwrapDoc, wrapDoc } from './wrap';

export function serializeToCRDT<T extends StandardSchemaV1>(
	data: StandardSchemaV1.InferInput<T>,
	clock: Clock,
): CRDTDoc<T> {
	if (typeof data !== 'object' || Array.isArray(data) || data === null) {
		throw new Error('Invalid data type');
	}

	const flattened = flatten(data);
	const wrapped = wrapDoc<T>(flattened, clock);
	return wrapped;
}

export function deserializeFromCRDT<T extends StandardSchemaV1>(
	data: CRDTDoc<T>,
): StandardSchemaV1.InferOutput<T> {
	const unwrapped = unwrapDoc<T>(data);
	const unflattened = unflatten(unwrapped);
	return unflattened;
}
