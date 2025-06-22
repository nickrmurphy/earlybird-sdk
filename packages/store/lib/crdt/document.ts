import type {
	DatabaseConfig,
	Document,
	DocumentFromSchema,
	Entity,
	IHLC,
	StoreData,
	StoreKey,
} from '../types';
import { hashObject, makeTimestamps } from '../utils';

export function makeDocument<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	hlc: Pick<IHLC, 'tick'>,
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
	hlc: Pick<IHLC, 'tick'>,
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

export function mergeDocuments<T extends Entity>(
	target: Document<T>,
	source: Document<T>,
): Document<T> {
	const mergedData: T = { ...target.$data };
	const mergedTimestamps: { [K in keyof T]: string } = {
		...target.$timestamps,
	};

	for (const key in source.$data) {
		const sourceTimestamp = source.$timestamps[key];
		const targetTimestamp = target.$timestamps[key];

		if (sourceTimestamp > targetTimestamp) {
			mergedData[key] = source.$data[key];
			mergedTimestamps[key] = sourceTimestamp;
		}
	}

	const finalTimestamp =
		source.$timestamp > target.$timestamp
			? source.$timestamp
			: target.$timestamp;

	return {
		$id: target.$id,
		$data: mergedData,
		$timestamp: finalTimestamp,
		$timestamps: mergedTimestamps,
		$hash: hashObject(mergedData),
	};
}
