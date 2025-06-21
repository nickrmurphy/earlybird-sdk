import type { DatabaseConfig, StoreKey, StoreSchema, StoreInput, TypedDatabase, HLC } from '../types';
import { makeDocument } from '../crdt/document';
import { addDocument } from './operations';
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
