import type { DatabaseConfig, StoreKey, StoreSchema, StoreInput, TypedDatabase, HLC } from '../types';
import { makeDocument } from '../crdt/document';
import { addDocument, getAllDocuments, getDocument, queryDocuments } from './operations';
import { standardValidate } from '../utils/validate';

export async function createOne<
    TConfig extends DatabaseConfig,
    TStoreName extends StoreKey<TConfig>
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    schema: StoreSchema<TConfig, TStoreName>,
    hlc: Pick<HLC, 'tick'>,
    data: StoreInput<TConfig, TStoreName>
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
    TStoreName extends StoreKey<TConfig>
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    schema: StoreSchema<TConfig, TStoreName>,
    hlc: Pick<HLC, 'tick'>,
    dataArray: StoreInput<TConfig, TStoreName>[]
): Promise<void> {
    // Validate each item in the array and create documents
    const documents = dataArray.map(data => {
        const validated = standardValidate(schema, data);
        return makeDocument(hlc, validated);
    });
    // Add all documents to the store
    await Promise.all(documents.map(doc => addDocument(db, storeName, doc)));
}

export async function getOne<
    TConfig extends DatabaseConfig,
    TStoreName extends StoreKey<TConfig>
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    id: string
): Promise<StoreInput<TConfig, TStoreName> | null> {
    // Fetch the document by ID from the store
    const document = await getDocument(db, storeName, id);
    // If the document exists, return its data; otherwise, return null
    return document ? document.$data : null;
}

export async function getAll<
    TConfig extends DatabaseConfig,
    TStoreName extends StoreKey<TConfig>
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName
): Promise<StoreInput<TConfig, TStoreName>[]> {
    // Fetch all documents from the store
    const documents = await getAllDocuments(db, storeName);
    // Return an array of document data
    return documents.map(doc => doc.$data);
}

export async function getWhere<
    TConfig extends DatabaseConfig,
    TStoreName extends StoreKey<TConfig>
>(
    db: TypedDatabase<TConfig>,
    storeName: TStoreName,
    predicate: (data: StoreInput<TConfig, TStoreName>) => boolean
): Promise<StoreInput<TConfig, TStoreName>[]> {
    // Fetch all documents from the store
    const documents = await queryDocuments(db, storeName, predicate);
    // Return an array of document data that match the predicate
    return documents.map(doc => doc.$data);
}
