import type { Data, Document } from "../crdt/types";

export type OnMutateCallback<T extends Data> = (operation: 'insert' | 'update', id: string, data: T) => void;

export type Store<T extends Data, K extends string = string> = {
  collectionName: string;
  get: (id: string) => Promise<T | null>;
  all: () => Promise<T[]>;
  where: (predicate: (item: T) => boolean) => Promise<T[]>;
  insert: (id: string, data: Omit<T, "id">) => Promise<void>;
  update: (id: string, data: Partial<Omit<T, "id">>) => Promise<T>;
  getHashes: () => Promise<{ root: string; buckets: BucketHashMap }>;
  getBuckets: (indices: number[]) => Promise<Record<string, Document<T>>>;
  mergeData: (data: Record<string, Document<T>>) => Promise<void>;
  addOnMutate: (key: K | (string & {}), callback: OnMutateCallback<T>) => void;
  removeOnMutate: (key: K | (string & {})) => void;
  clearOnMutate: () => void;
};

// <bucket number, bucket hash>
export type BucketHashMap = Record<number, string>;
