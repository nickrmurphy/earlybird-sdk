import type { Data, Document } from "../crdt/types";
import type { BucketHashMap } from "../store/types";

export type SyncClientConfig = {
  baseUrl: string;
};

export type HashResponse = {
  root: string;
  buckets: BucketHashMap;
};

export type CollectionResponse<T extends Data> = {
  documents: Record<string, Document<T>>;
};
