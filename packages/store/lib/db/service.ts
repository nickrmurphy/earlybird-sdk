import { makeDocument, updateDocument } from '../crdt/document';
import type {
	DatabaseConfig,
	ReadContext,
	StoreData,
	StoreDocument,
	StoreKey,
	WriteContext,
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
	ctx: WriteContext<TConfig, TStoreName>,
	data: StoreData<TConfig, TStoreName>,
): Promise<void> {
	// Validate the data using the schema
	const validated = standardValidate(ctx.schema, data);
	// Create a document from the validated data
	const document = makeDocument(ctx.hlc, validated);
	// Add the document to the store
	await addDocument(ctx.db, ctx.storeName, document);
}

export async function createMany<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	ctx: WriteContext<TConfig, TStoreName>,
	dataArray: StoreData<TConfig, TStoreName>[],
): Promise<void> {
	// Validate each item in the array and create documents
	const documents = dataArray.map((data) => {
		const validated = standardValidate(ctx.schema, data);
		return makeDocument(ctx.hlc, validated);
	});
	// Add all documents to the store
	await Promise.all(
		documents.map((doc) => addDocument(ctx.db, ctx.storeName, doc)),
	);
}

export async function getOne<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	ctx: ReadContext<TConfig, TStoreName>,
	id: string,
): Promise<StoreData<TConfig, TStoreName> | null> {
	// Fetch the document by ID from the store
	const document = await getDocument(ctx.db, ctx.storeName, id);
	// If the document exists, return its data; otherwise, return null
	return document ? document.$data : null;
}

export async function getAll<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	ctx: ReadContext<TConfig, TStoreName>,
): Promise<StoreData<TConfig, TStoreName>[]> {
	// Fetch all documents from the store
	const documents = await getAllDocuments(ctx.db, ctx.storeName);
	// Return an array of document data
	return documents.map((doc) => doc.$data);
}

export async function getWhere<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	ctx: ReadContext<TConfig, TStoreName>,
	predicate: (data: StoreData<TConfig, TStoreName>) => boolean,
): Promise<StoreData<TConfig, TStoreName>[]> {
	// Fetch all documents from the store
	const documents = await queryDocuments(ctx.db, ctx.storeName, predicate);
	// Return an array of document data that match the predicate
	return documents.map((doc) => doc.$data);
}

export async function updateOne<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	ctx: WriteContext<TConfig, TStoreName>,
	id: string,
	data: Partial<StoreData<TConfig, TStoreName>>,
): Promise<void> {
	const existingDocument = await getDocument(ctx.db, ctx.storeName, id);
	if (!existingDocument) {
		throw new Error(
			`Document with ID ${id} does not exist in store ${ctx.storeName}`,
		);
	}

	const updatedData = { ...existingDocument.$data, ...data };
	// Validate the merged data using the schema
	standardValidate(ctx.schema, updatedData);
	// Create a updated document, passing only the changed data
	const document = updateDocument(ctx.hlc, existingDocument, data);
	// Update the document in the store
	await putDocument(ctx.db, ctx.storeName, document);
}

export async function updateMany<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	ctx: WriteContext<TConfig, TStoreName>,
	updates: { id: string; data: Partial<StoreData<TConfig, TStoreName>> }[],
): Promise<void> {
	// Fetch all existing documents first
	const existingDocuments = await Promise.all(
		updates.map(async (update) => {
			const existingDocument = await getDocument(
				ctx.db,
				ctx.storeName,
				update.id,
			);
			if (!existingDocument) {
				throw new Error(
					`Document with ID ${update.id} does not exist in store ${ctx.storeName}`,
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
			standardValidate(ctx.schema, updatedData);
			// Create updated document, passing only the changed data
			return updateDocument(ctx.hlc, existingDocument, update.data);
		},
	);

	// Update all documents in the store
	await putDocuments(ctx.db, ctx.storeName, updatedDocuments);
}

export async function getHashes<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	ctx: ReadContext<TConfig, TStoreName>,
	bucketSize = 100,
): Promise<{ root: string; buckets: Record<number, string> }> {
	const documents = (await getAllDocuments(ctx.db, ctx.storeName)).sort(
		(a, b) => a.$timestamp.localeCompare(b.$timestamp),
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
	ctx: ReadContext<TConfig, TStoreName>,
	buckets: number[],
	bucketSize = 100,
): Promise<StoreDocument<TConfig, TStoreName>[]> {
	const getIndices = new Set<number>(
		buckets.flatMap((bucket) => {
			const start = bucket * bucketSize;
			const end = start + bucketSize;
			return Array.from({ length: end - start }, (_, i) => start + i);
		}),
	);

	const documents = await getAllDocuments(ctx.db, ctx.storeName);
	documents.sort((a, b) => a.$timestamp.localeCompare(b.$timestamp));
	return documents.filter((_, index) => getIndices.has(index));
}

export async function create<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	ctx: WriteContext<TConfig, TStoreName>,
	data: StoreData<TConfig, TStoreName> | StoreData<TConfig, TStoreName>[],
): Promise<void> {
	if (Array.isArray(data)) {
		return createMany(ctx, data);
	}
	return createOne(ctx, data);
}

export async function update<
	TConfig extends DatabaseConfig,
	TStoreName extends StoreKey<TConfig>,
>(
	ctx: WriteContext<TConfig, TStoreName>,
	data:
		| { id: string; data: Partial<StoreData<TConfig, TStoreName>> }
		| { id: string; data: Partial<StoreData<TConfig, TStoreName>> }[],
): Promise<void> {
	if (Array.isArray(data)) {
		return updateMany(ctx, data);
	}
	return updateOne(ctx, data.id, data.data);
}
