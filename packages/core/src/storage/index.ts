/**
 * Storage module exports for the Earlybird SDK
 *
 * This module provides the core storage abstractions including the
 * StorageAdapter interface, error types, and concrete adapter implementations.
 */

// Core interface
export type { StorageAdapter } from "./StorageAdapter.js";

// Error types and utilities
export { StorageError, StorageErrorCode } from "./errors.js";

// Adapter implementations
export { InMemoryStorageAdapter } from "./adapters/index.js";

// Path utilities (for advanced usage)
export {
  normalizePath,
  isValidPath,
  getDirectory,
  getFilename,
  joinPath,
} from "./utils/path.js";
