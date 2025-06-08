import type { Data, Document } from "../crdt/types";
import type { StorageAdapter } from "../storage/types";
import type { Store, OnMutateCallback } from "./types";

import { createHLC } from "../hlc";
import {
  all,
  get,
  getBuckets,
  getHashes,
  insert,
  mergeData,
  update,
  where,
} from "./store";

export const createStore = <T extends Data, K extends string = string>(
  adapter: StorageAdapter,
  collectionName: string,
  basePath = "_store",
): Store<T, K> => {
  const hlcManager = createHLC(adapter, basePath, collectionName);
  const mutateCallbacks = new Map<string, OnMutateCallback<T>>();

  const callMutateCallbacks = (operation: 'insert' | 'update', id: string, data: T) => {
    mutateCallbacks.forEach(callback => callback(operation, id, data));
  };

  return {
    collectionName,
    get: async (id: string) => {
      return get(adapter, basePath, collectionName, id);
    },
    all: async () => {
      return all(adapter, basePath, collectionName);
    },
    where: async (predicate: (item: T) => boolean) => {
      return where(adapter, basePath, collectionName, predicate);
    },
    insert: async (id: string, item: Omit<T, "id">) => {
      const hlc = await hlcManager.advance();
      await insert(adapter, hlc, basePath, collectionName, id, item);
      callMutateCallbacks('insert', id, { id, ...item } as T);
    },
    update: async (id: string, item: Partial<Omit<T, "id">>) => {
      const hlc = await hlcManager.advance();
      const updatedData = await update<T>(
        adapter,
        hlc,
        basePath,
        collectionName,
        id,
        item as Partial<T>,
      );
      callMutateCallbacks('update', id, updatedData);
      return updatedData;
    },
    getHashes: async () => {
      return getHashes(adapter, basePath, collectionName);
    },
    mergeData: async (documentMap: Record<string, Document<T>>) => {
      await mergeData(adapter, basePath, collectionName, documentMap);
    },
    getBuckets: async (indices: number[]) => {
      return getBuckets<T>(adapter, basePath, collectionName, indices);
    },
    addOnMutate: (key: string, callback: OnMutateCallback<T>) => {
      mutateCallbacks.set(key, callback);
    },
    removeOnMutate: (key: string) => {
      mutateCallbacks.delete(key);
    },
    clearOnMutate: () => {
      mutateCallbacks.clear();
    },
  };
};
