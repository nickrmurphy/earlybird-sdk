/**
 * @earlybird-sdk/storage
 *
 * Storage abstractions and adapters for building local-first applications.
 *
 * This package provides a unified interface for file storage operations
 * across different platforms (web, mobile, Node.js).
 *
 * @see https://github.com/nickrmurphy/earlybird-sdk
 */

// Core interface
export type { StorageAdapter } from "./StorageAdapter.js";

// Error types and utilities
export { StorageError, StorageErrorCode } from "./errors.js";

// Adapter implementations
export { InMemoryStorageAdapter } from "./adapters/InMemoryStorageAdapter.js";
export { CapacitorStorageAdapter } from "./adapters/CapacitorStorageAdapter.js";

// Path utilities
export {
	normalizePath,
	isValidPath,
	getDirectory,
	getFilename,
	joinPath,
} from "./utils/path.js";
