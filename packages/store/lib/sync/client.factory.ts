import type { Data } from "../crdt/types";
import type { Store } from "../store/types";
import type { SyncClientConfig } from "./types";
import { pullChanges, pushChanges } from "./client";

export const createClient = <T extends Data>(
  store: Store<T>,
  config: SyncClientConfig,
) => {
  return {
    pull: async () => {
      await pullChanges(store, config);
    },
    push: async () => {
      await pushChanges(store, config);
    },
  };
};
