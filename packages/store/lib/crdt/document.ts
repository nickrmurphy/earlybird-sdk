import type {
	DatabaseConfig,
	Document,
	DocumentFromSchema,
	Entity,
	HLC,
	StoreKey,
	StoreData,
} from '../types';
import { hashObject, makeTimestamps } from '../utils';

export function makeDocument<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	hlc: Pick<HLC, 'tick'>,
	data: StoreData<TConfig, TStoreName>,
): DocumentFromSchema<TConfig['stores'][TStoreName]> {
	const timestamps = makeTimestamps(hlc, data);
	const timestamp = hlc.tick();
	return {
		$id: data.id,
		$data: data,
		$timestamp: timestamp,
		$timestamps: timestamps,
		$hash: hashObject(data),
	} as DocumentFromSchema<TConfig['stores'][TStoreName]>;
}

export function updateDocument<T extends Entity>(
	hlc: Pick<HLC, 'tick'>,
	doc: Document<T>,
	data: Partial<T>,
): Document<T> {
	const updatedTimestamps = {
		...doc.$timestamps,
		...makeTimestamps(hlc, data),
	};
	const updatedData = { ...doc.$data, ...data };
	const timestamp = hlc.tick();
	return {
		$id: doc.$id,
		$data: updatedData,
		$timestamp: timestamp,
		$timestamps: updatedTimestamps,
		$hash: hashObject(updatedData),
	};
}
