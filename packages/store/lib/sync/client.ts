import type { Data } from "../crdt/types";
import type { Store, BucketHashMap } from "../store/types";
import type {
  CollectionResponse,
  HashResponse,
  SyncClientConfig,
} from "./types";

const fetchHashes = async (
  baseUrl: string,
  collectionName: string,
): Promise<HashResponse> => {
  const requestUrl = `${baseUrl}/${collectionName}/hashes`;
  const hashResponse = await fetch(requestUrl);

  if (!hashResponse.ok) {
    throw new Error(`Failed to fetch hashes: ${hashResponse.status}`);
  }

  const rawHashes = await hashResponse.json();

  return {
    root: rawHashes.root,
    buckets: rawHashes.buckets || {},
  };
};

const diffBuckets = (mapA: BucketHashMap, mapB: BucketHashMap): number[] => {
  const diffIndexes: number[] = [];

  // Get all unique bucket indexes from both records
  const allIndexes = new Set([
    ...Object.keys(mapA).map(Number),
    ...Object.keys(mapB).map(Number),
  ]);

  for (const index of allIndexes) {
    const hashA = mapA[index];
    const hashB = mapB[index];
    // If hashes are different (including when one is missing), add to diff list
    if (hashA !== hashB) {
      diffIndexes.push(index);
    }
  }
  return diffIndexes.sort((a, b) => a - b); // Return sorted for consistency
};

const fetchData = async <T extends Data>(
  baseUrl: string,
  collectionName: string,
  buckets: number[],
): Promise<CollectionResponse<T>> => {
  const params = new URLSearchParams({ buckets: buckets.join(",") });
  const dataResponse = await fetch(
    `${baseUrl}/${collectionName}?${params.toString()}`,
  );

  if (!dataResponse.ok) {
    throw new Error(`Failed to fetch data: ${dataResponse.status}`);
  }

  const rawData = await dataResponse.json();

  return { documents: rawData };
};

export const pullChanges = async <T extends Data>(
  store: Store<T>,
  config: SyncClientConfig,
): Promise<void> => {
  const remoteHashes = await fetchHashes(config.baseUrl, store.collectionName);
  const localHashes = await store.getHashes();

  if (localHashes.root === remoteHashes.root) {
    return;
  }

  const changedBuckets = diffBuckets(localHashes.buckets, remoteHashes.buckets);

  if (changedBuckets.length === 0) {
    return;
  }

  const remoteData = await fetchData<T>(
    config.baseUrl,
    store.collectionName,
    changedBuckets,
  );

  await store.mergeData(remoteData.documents);
};

export const pushChanges = async <T extends Data>(
  store: Store<T>,
  config: SyncClientConfig,
): Promise<void> => {
  const localHashes = await store.getHashes();
  const remoteHashes = await fetchHashes(config.baseUrl, store.collectionName);

  if (localHashes.root === remoteHashes.root) {
    return;
  }

  const changedBuckets = diffBuckets(localHashes.buckets, remoteHashes.buckets);

  if (changedBuckets.length === 0) {
    return;
  }

  const localData = await store.getBuckets(changedBuckets);
  const dataResponse = await fetch(
    `${config.baseUrl}/${store.collectionName}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(localData),
    },
  );

  if (!dataResponse.ok) {
    throw new Error(`Failed to push changes: ${dataResponse.status}`);
  }
};
