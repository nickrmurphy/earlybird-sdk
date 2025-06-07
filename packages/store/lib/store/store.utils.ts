import type { Data, Document } from "../crdt/types";
import type { HLC } from "../hlc/types";
import { readDocument, makeDocument, mergeDocument } from "../crdt";

// Utility functions for file operations and serialization
export const createFilePath = (
  basePath: string,
  collection: string,
  id: string,
): string => `${basePath}/${collection}/${id}.json`;

export const createCollectionPath = (
  basePath: string,
  collection: string,
): string => `${basePath}/${collection}`;

export const deserializeDocument = <T extends Data>(content: string): Document<T> =>
  JSON.parse(content);

export const serializeDocument = <T extends Data>(doc: Document<T>): string =>
  JSON.stringify(doc);

// Pure business logic functions for CRUD operations
export const parseDocumentContent = <T extends Data>(content: string): T => {
  const doc: Document<T> = deserializeDocument<T>(content);
  return readDocument(doc);
};

export const prepareInsertDocument = <T extends Data>(
  hlc: HLC,
  id: string,
  data: Omit<T, "id">,
): Document<T> => {
  return makeDocument(hlc, id, { ...data, id } as T);
};

export const filterDefinedValues = <T extends Data>(
  data: Partial<T>,
): Partial<T> => {
  return Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined),
  ) as Partial<T>;
};

export const prepareUpdateDocument = <T extends Data>(
  hlc: HLC,
  id: string,
  currentDocument: Document<T>,
  updateData: Partial<T>,
): { mergedDocument: Document<T>; mergedData: T } => {
  const filteredData = filterDefinedValues(updateData);
  
  // Explicitly specify the type parameter for makeDocument
  const newDocument = makeDocument<T>(hlc, id, {
    ...filteredData,
    id,
  } as T);

  const mergedDocument = mergeDocument(currentDocument, newDocument);
  const mergedData = readDocument(mergedDocument) as T;
  
  return { mergedDocument, mergedData };
};

export const createLocalDocumentLookup = (files: string[]): Set<string> => {
  return new Set(files.map((file) => file.replace(".json", "")));
};

export const prepareMergeOperation = <T extends Data>(
  localDoc: Document<T>,
  remoteDoc: Document<T>,
): Document<T> => {
  return mergeDocument(localDoc, remoteDoc);
};

export const processMergeOperations = <T extends Data>(
  localDocIds: Set<string>,
  remoteDocuments: Record<string, Document<T>>,
): {
  mergeOperations: Array<{ docId: string; remoteDoc: Document<T> }>;
  addOperations: Array<{ docId: string; remoteDoc: Document<T> }>;
} => {
  const mergeOperations: Array<{ docId: string; remoteDoc: Document<T> }> = [];
  const addOperations: Array<{ docId: string; remoteDoc: Document<T> }> = [];

  for (const [docId, remoteDoc] of Object.entries(remoteDocuments)) {
    if (localDocIds.has(docId)) {
      mergeOperations.push({ docId, remoteDoc });
    } else {
      addOperations.push({ docId, remoteDoc });
    }
  }

  return { mergeOperations, addOperations };
};
