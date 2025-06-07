import type { Data, Document } from "../crdt/types";
import type { HLC } from "../hlc/types";
import type { StorageAdapter } from "../storage/types";
import type { BucketHashMap } from "./types";

import {
  computeHash,
  readDocument,
} from "../crdt";
import {
  createFilePath,
  createCollectionPath,
  deserializeDocument,
  serializeDocument,
  parseDocumentContent,
  prepareInsertDocument,
  prepareUpdateDocument,
  createLocalDocumentLookup,
  prepareMergeOperation,
  processMergeOperations,
} from "./store.utils";

export const get = async <T extends Data>(
  adapter: StorageAdapter,
  basePath: string,
  collection: string,
  id: string,
): Promise<T | null> => {
  const content = await adapter.read(createFilePath(basePath, collection, id));
  if (!content) return null;
  return parseDocumentContent<T>(content);
};

export const insert = async <T extends Data>(
  adapter: StorageAdapter,
  hlc: HLC,
  basePath: string,
  collection: string,
  id: string,
  data: Omit<T, "id">,
): Promise<void> => {
  const document = prepareInsertDocument(hlc, id, data);
  await adapter.write(
    createFilePath(basePath, collection, id),
    serializeDocument(document),
  );
};

export const update = async <T extends Data>(
  adapter: StorageAdapter,
  hlc: HLC,
  basePath: string,
  collection: string,
  id: string,
  data: Partial<T>,
): Promise<T> => {
  const content = await adapter.read(createFilePath(basePath, collection, id));

  if (!content) {
    throw new Error(`Document ${id} not found`);
  }

  const currentDocument: Document<T> = deserializeDocument<T>(content);
  const { mergedDocument, mergedData } = prepareUpdateDocument(
    hlc,
    id,
    currentDocument,
    data,
  );

  await adapter.write(
    createFilePath(basePath, collection, id),
    serializeDocument(mergedDocument),
  );

  return mergedData;
};

export const all = async <T extends Data>(
  adapter: StorageAdapter,
  basePath: string,
  collection: string,
): Promise<T[]> => {
  const files = await adapter.list(createCollectionPath(basePath, collection));
  const documents = await Promise.all(
    files.map(async (file) => {
      const content = await adapter.read(
        `${createCollectionPath(basePath, collection)}/${file}`,
      );
      if (!content) return null;
      const doc: Document<T> = deserializeDocument<T>(content);
      return readDocument(doc);
    }),
  );

  return documents.filter((doc) => doc !== null);
};

export const where = async <T extends Data>(
  adapter: StorageAdapter,
  basePath: string,
  collection: string,
  predicate: (item: T) => boolean,
): Promise<T[]> => {
  const files = await adapter.list(createCollectionPath(basePath, collection));

  const documents = await Promise.all(
    files.map(async (file) => {
      const content = await adapter.read(
        `${createCollectionPath(basePath, collection)}/${file}`,
      );
      if (!content) return null;
      const doc: Document<T> = deserializeDocument<T>(content);
      const item = readDocument(doc);
      if (predicate(item)) {
        return item;
      }
      return null;
    }),
  );

  return documents.filter((doc) => doc !== null);
};

export const getHashes = async <T extends Data>(
  adapter: StorageAdapter,
  basePath: string,
  collection: string,
): Promise<{ root: string; buckets: BucketHashMap }> => {
  const BUCKET_SIZE = 100;
  const files = await adapter.list(
    `${createCollectionPath(basePath, collection)}/`,
  );
  let rootHash = "";
  const bucketHashes: BucketHashMap = {};

  for (let i = 0; i < files.length; i++) {
    // Run sequentially for deterministic results
    const fileName = files[i];
    const content = await adapter.read(
      `${createCollectionPath(basePath, collection)}/${fileName}`,
    );
    if (!content) continue;
    const doc: Document<T> = deserializeDocument<T>(content);
    // Update root hash with current document hash
    rootHash = computeHash(`${rootHash}:${doc._hash}`);

    // Update bucket hash with current document hash
    const currentBucketIndex = Math.floor(i / BUCKET_SIZE);
    const currentBucketHash = bucketHashes[currentBucketIndex] || "";
    bucketHashes[currentBucketIndex] = computeHash(
      `${currentBucketHash}:${doc._hash}`,
    );
  }
  return { root: rootHash, buckets: bucketHashes };
};

export const mergeData = async <T extends Data>(
  adapter: StorageAdapter,
  basePath: string,
  collection: string,
  documentMap: Record<string, Document<T>>,
): Promise<void> => {
  const files = await adapter.list(createCollectionPath(basePath, collection));
  const localDocIds = createLocalDocumentLookup(files);
  const { mergeOperations, addOperations } = processMergeOperations(
    localDocIds,
    documentMap,
  );

  // Process merge operations
  for (const { docId, remoteDoc } of mergeOperations) {
    const content = await adapter.read(
      createFilePath(basePath, collection, docId),
    );
    if (content) {
      const localDoc: Document<T> = deserializeDocument<T>(content);
      const mergedDocument = prepareMergeOperation(localDoc, remoteDoc);

      await adapter.write(
        createFilePath(basePath, collection, docId),
        serializeDocument(mergedDocument),
      );
    }
  }

  // Process add operations
  for (const { docId, remoteDoc } of addOperations) {
    await adapter.write(
      createFilePath(basePath, collection, docId),
      serializeDocument(remoteDoc),
    );
  }
};

const calculateDocumentIndices = (bucketIndices: number[]) => {
  const BUCKET_SIZE = 100;
  const indices = new Set<number>();

  for (const index of bucketIndices) {
    const start = index * BUCKET_SIZE;
    Array.from({ length: BUCKET_SIZE }).forEach((_, i) =>
      indices.add(start + i),
    );
  }

  return indices;
};

export const getBuckets = async <T extends Data>(
  adapter: StorageAdapter,
  basePath: string,
  collection: string,
  bucketIndices: number[],
): Promise<Record<string, Document<T>>> => {
  const files = await adapter.list(createCollectionPath(basePath, collection));

  if (files.length === 0) return {};

  const localDocs: Record<string, Document<T>> = {};
  const documentIndices = calculateDocumentIndices(bucketIndices);
  for (const index of documentIndices) {
    if (index >= files.length) continue;

    const targetFile = files[index];
    const content = await adapter.read(
      `${createCollectionPath(basePath, collection)}/${targetFile}`,
    );

    if (!content) continue;

    const doc = deserializeDocument<T>(content);
    localDocs[doc.id] = doc;
  }
  return localDocs;
};
