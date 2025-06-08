export { createStore } from "./lib/store";
export type { Store } from "./lib/store";

export type { Data } from "./lib/crdt";

export {
  createLibSQLAdapter,
  createNodeFsAdapter,
  createCapacitorAdapter,
} from "./lib/storage";

export { createClient } from "./lib/sync";
