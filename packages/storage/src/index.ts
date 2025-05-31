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
export type { Result } from "@earlybird-sdk/core";
export { ok, err } from "@earlybird-sdk/core";

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
