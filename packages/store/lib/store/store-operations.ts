import type { StandardSchemaV1 } from '../../standard-schema.types';
import type { Clock } from '../crdt/hlc';
import type { CRDTDoc, CRDTStore } from './store';

import { mergeDocuments } from '../crdt/merge';
import { deserializeFromCRDT, serializeToCRDT } from '../crdt/serialize';
import { accumulateHashes, bucketHashes } from '../utils/hash';
import { standardValidate } from '../utils/validate';

export type DocumentNotFoundError = {
	type: 'DOCUMENT_NOT_FOUND';
	id: string;
	message: string;
};

export type OperationError = {
	type: 'OPERATION_ERROR';
	message: string;
};

export type StoreError = DocumentNotFoundError | OperationError;

export type OperationResult<T> =
	| { success: true; data: T }
	| { success: false; error: StoreError };

const HASH_BUCKET_SIZE = 100;

/**
 * Pure function to create a new CRDT document from input data
 */
export function createDocumentOperation<T extends StandardSchemaV1>(
	schema: T,
	value: StandardSchemaV1.InferInput<T>,
	clock: Clock,
): OperationResult<CRDTDoc<T>> {
	try {
		const validated = standardValidate(schema, value);
		const doc = serializeToCRDT(validated, clock);
		return { success: true, data: doc };
	} catch (error) {
		return {
			success: false,
			error: {
				type: 'OPERATION_ERROR',
				message:
					error instanceof Error ? error.message : 'Unknown operation error',
			},
		};
	}
}

/**
 * Pure function to update an existing CRDT document with partial data
 */
export function updateDocumentOperation<T extends StandardSchemaV1>(
	schema: T,
	existingDoc: CRDTDoc<T>,
	updates: Partial<StandardSchemaV1.InferInput<T>>,
	clock: Clock,
): OperationResult<CRDTDoc<T>> {
	try {
		const current = deserializeFromCRDT(existingDoc);
		const rawMerge: unknown = { ...(current as object), ...updates };

		// Validate the merged result
		standardValidate(schema, rawMerge);

		// Create CRDT updates and merge with existing document
		const updatesCRDT = serializeToCRDT<T>(updates, clock);
		const mergedDoc = mergeDocuments<T>(existingDoc, updatesCRDT);

		return { success: true, data: mergedDoc };
	} catch (error) {
		return {
			success: false,
			error: {
				type: 'OPERATION_ERROR',
				message:
					error instanceof Error ? error.message : 'Unknown operation error',
			},
		};
	}
}

/**
 * Pure function to merge two CRDT stores
 */
export function mergeStoreOperation<T extends StandardSchemaV1>(
	targetStore: CRDTStore<T>,
	sourceStore: CRDTStore<T>,
): CRDTStore<T> {
	const result: CRDTStore<T> = { ...targetStore };

	for (const [id, doc] of Object.entries(sourceStore)) {
		const existingDoc = result[id];
		if (!existingDoc) {
			result[id] = doc;
		} else {
			result[id] = mergeDocuments<T>(existingDoc, doc);
		}
	}

	return result;
}

/**
 * Pure function to get a document from store with validation
 */
export function getDocumentOperation<T extends StandardSchemaV1>(
	storeData: CRDTStore<T>,
	id: string,
): CRDTDoc<T> | null {
	return storeData[id] || null;
}

/**
 * Pure function to validate document exists and return it
 */
export function validateDocumentExists<T extends StandardSchemaV1>(
	storeData: CRDTStore<T>,
	id: string,
): OperationResult<CRDTDoc<T>> {
	const doc = storeData[id];
	if (!doc) {
		return {
			success: false,
			error: {
				type: 'DOCUMENT_NOT_FOUND',
				id,
				message: `Document with id ${id} not found`,
			},
		};
	}
	return { success: true, data: doc };
}

/**
 * Pure function to deserialize and validate all documents in a store
 */
export function deserializeStoreOperation<T extends StandardSchemaV1>(
	schema: T,
	storeData: CRDTStore<T>,
): OperationResult<Record<string, StandardSchemaV1.InferOutput<T>>> {
	try {
		const result: Record<string, StandardSchemaV1.InferOutput<T>> = {};

		for (const [id, doc] of Object.entries(storeData)) {
			const deserialized = deserializeFromCRDT(doc);
			const validated = standardValidate(schema, deserialized);
			result[id] = validated;
		}

		return { success: true, data: result };
	} catch (error) {
		return {
			success: false,
			error: {
				type: 'OPERATION_ERROR',
				message:
					error instanceof Error ? error.message : 'Unknown operation error',
			},
		};
	}
}

/**
 * Pure function to deserialize and validate a single document
 */
export function deserializeDocumentOperation<T extends StandardSchemaV1>(
	schema: T,
	doc: CRDTDoc<T>,
): OperationResult<StandardSchemaV1.InferOutput<T>> {
	try {
		const deserialized = deserializeFromCRDT(doc);
		const validated = standardValidate(schema, deserialized);
		return { success: true, data: validated };
	} catch (error) {
		return {
			success: false,
			error: {
				type: 'OPERATION_ERROR',
				message:
					error instanceof Error ? error.message : 'Unknown operation error',
			},
		};
	}
}

export function getStoreHashes<T extends StandardSchemaV1>(
	storeData: CRDTStore<T>,
): { root: string; buckets: Record<string, string> } {
	const sortedHashArray = Object.values(storeData)
		.sort((a, b) => a.$hlc.localeCompare(b.$hlc))
		.map((doc) => doc.$hash);
	const root = accumulateHashes(sortedHashArray);
	const buckets = bucketHashes(sortedHashArray, HASH_BUCKET_SIZE);
	return { root, buckets };
}

/**
 * Pure function to get documents from specific bucket indices
 */
export function getDocumentsByBucketOperation<T extends StandardSchemaV1>(
	storeData: CRDTStore<T>,
	bucketIndices: number[],
): CRDTDoc<T>[] {
	if (bucketIndices.length === 0) {
		return [];
	}

	const sortedDocs = Object.values(storeData)
		.sort((a, b) => a.$hlc.localeCompare(b.$hlc));

	const bucketSet = new Set(bucketIndices);
	const result: CRDTDoc<T>[] = [];

	for (let i = 0; i < sortedDocs.length; i++) {
		const bucketIndex = Math.floor(i / HASH_BUCKET_SIZE);
		if (bucketSet.has(bucketIndex)) {
			const doc = sortedDocs[i];
			if (doc) {
				result.push(doc);
			}
		}
	}

	return result;
}
