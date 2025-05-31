/**
 * Storage adapter implementations for the Earlybird SDK
 *
 * This module exports Node.js-compatible storage adapter implementations.
 *
 * Note: CapacitorStorageAdapter is available but not exported here due to Node.js compatibility issues.
 * Import it directly when needed in Capacitor environments:
 * import { CapacitorStorageAdapter } from '@earlybird/core/src/storage/adapters/CapacitorStorageAdapter.js';
 */

export { InMemoryStorageAdapter } from "./InMemoryStorageAdapter.js";
