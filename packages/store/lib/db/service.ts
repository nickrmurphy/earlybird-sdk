import { makeDocument, updateDocument } from '../crdt/document';
import type {
	DatabaseConfig,
	HLC,
	InferDocument,
	StoreInput,
	StoreKey,
	StoreSchema,
	TypedDatabase,
} from '../types';
import { accumulateHashes, bucketHashes } from '../utils';
import { standardValidate } from '../utils/validate';
import {
	addDocument,
	getAllDocuments,
	getDocument,
	putDocument,
	putDocuments,
	queryDocuments,
} from './operations';

export async function createOne<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	db: TypedDatabase<TConfig>,
	storeName: TStoreName,
	schema: StoreSchema<TConfig, TStoreName>,
	hlc: Pick<HLC, 'tick'>,
	data: StoreInput<TConfig, TStoreName>,
): Promise<void> {
	// Validate the data using the schema
	const validated = standardValidate(schema, data);
	// Create a document from the validated data
	const document = makeDocument(hlc, validated);
	// Add the document to the store
	await addDocument(db, storeName, document);
}

export async function createMany<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	db: TypedDatabase<TConfig>,
	storeName: TStoreName,
	schema: StoreSchema<TConfig, TStoreName>,
	hlc: Pick<HLC, 'tick'>,
	dataArray: StoreInput<TConfig, TStoreName>[],
): Promise<void> {
	// Validate each item in the array and create documents
	const documents = dataArray.map((data) => {
		const validated = standardValidate(schema, data);
		return makeDocument(hlc, validated);
	});
	// Add all documents to the store
	await Promise.all(documents.map((doc) => addDocument(db, storeName, doc)));
}

export async function getOne<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	db: TypedDatabase<TConfig>,
	storeName: TStoreName,
	id: string,
): Promise<StoreInput<TConfig, TStoreName> | null> {
	// Fetch the document by ID from the store
	const document = await getDocument(db, storeName, id);
	// If the document exists, return its data; otherwise, return null
	return document ? document.$data : null;
}

export async function getAll<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	db: TypedDatabase<TConfig>,
	storeName: TStoreName,
): Promise<StoreInput<TConfig, TStoreName>[]> {
	// Fetch all documents from the store
	const documents = await getAllDocuments(db, storeName);
	// Return an array of document data
	return documents.map((doc) => doc.$data);
}

export async function getWhere<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	db: TypedDatabase<TConfig>,
	storeName: TStoreName,
	predicate: (data: StoreInput<TConfig, TStoreName>) => boolean,
): Promise<StoreInput<TConfig, TStoreName>[]> {
	// Fetch all documents from the store
	const documents = await queryDocuments(db, storeName, predicate);
	// Return an array of document data that match the predicate
	return documents.map((doc) => doc.$data);
}

export async function updateOne<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	db: TypedDatabase<TConfig>,
	storeName: TStoreName,
	schema: StoreSchema<TConfig, TStoreName>,
	hlc: Pick<HLC, 'tick'>,
	id: string,
	data: Partial<StoreInput<TConfig, TStoreName>>,
): Promise<void> {
	const existingDocument = await getDocument(db, storeName, id);
	if (!existingDocument) {
		throw new Error(
			`Document with ID ${id} does not exist in store ${storeName}`,
		);
	}

	const updatedData = { ...existingDocument.$data, ...data };
	// Validate the merged data using the schema
	standardValidate(schema, updatedData);
	// Create a updated document, passing only the changed data
	const document = updateDocument(hlc, existingDocument, data);
	// Update the document in the store
	await putDocument(db, storeName, document);
}

export async function updateMany<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	db: TypedDatabase<TConfig>,
	storeName: TStoreName,
	schema: StoreSchema<TConfig, TStoreName>,
	hlc: Pick<HLC, 'tick'>,
	updates: { id: string; data: Partial<StoreInput<TConfig, TStoreName>> }[],
): Promise<void> {
	// Fetch all existing documents first
	const existingDocuments = await Promise.all(
		updates.map(async (update) => {
			const existingDocument = await getDocument(db, storeName, update.id);
			if (!existingDocument) {
				throw new Error(
					`Document with ID ${update.id} does not exist in store ${storeName}`,
				);
			}
			return { existingDocument, update };
		}),
	);

	// Process all updates
	const updatedDocuments = existingDocuments.map(
		({ existingDocument, update }) => {
			const updatedData = { ...existingDocument.$data, ...update.data };
			// Validate the merged data using the schema
			standardValidate(schema, updatedData);
			// Create updated document, passing only the changed data
			return updateDocument(hlc, existingDocument, update.data);
		},
	);

	// Update all documents in the store
	await putDocuments(db, storeName, updatedDocuments);
}

export async function getHashes<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	db: TypedDatabase<TConfig>,
	storeName: TStoreName,
	bucketSize = 100,
): Promise<{ root: string; buckets: Record<number, string> }> {
	const documents = (await getAllDocuments(db, storeName)).sort((a, b) =>
		a.$timestamp.localeCompare(b.$timestamp),
	);
	const allHashes = documents.map((doc) => doc.$hash);
	const root = accumulateHashes(allHashes);
	const buckets = bucketHashes(allHashes, bucketSize);
	return { root, buckets };
}

export async function getDocumentsInBuckets<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	db: TypedDatabase<TConfig>,
	storeName: TStoreName,
	buckets: number[],
	bucketSize = 100,
): Promise<InferDocument<TConfig, TStoreName>[]> {
	const getIndices = new Set<number>(
		buckets.flatMap((bucket) => {
			const start = bucket * bucketSize;
			const end = start + bucketSize;
			return Array.from({ length: end - start }, (_, i) => start + i);
		}),
	);

	const documents = await getAllDocuments(db, storeName);
	documents.sort((a, b) => a.$timestamp.localeCompare(b.$timestamp));
	return documents.filter((_, index) => getIndices.has(index));
}
