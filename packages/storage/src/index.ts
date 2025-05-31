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

// Core interface and error codes
export type { StorageAdapter } from "./storageAdapter.js";
export { StorageErrorCode } from "./storageAdapter.js";

// Result type
export type { Result } from "./utils/result.js";
export { ok, err } from "./utils/result.js";

// Adapter implementations
export { createInMemoryStorageAdapter } from "./adapters/createInMemoryStorageAdapter.js";

// Path utilities
export {
	normalizePath,
	isValidPath,
	getDirectory,
	getFilename,
	joinPath,
	validateAndNormalizePath,
} from "./utils/path.js";
