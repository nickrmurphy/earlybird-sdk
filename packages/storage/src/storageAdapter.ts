import type { Result } from "./utils/result.js";

/**
 * Error codes for storage operations
 */
export const StorageErrorCode = {
	/** The requested file or path was not found */
	NOT_FOUND: "NOT_FOUND",
	/** The storage operation failed for an unknown reason */
	OPERATION_FAILED: "OPERATION_FAILED",
	/** The provided path is invalid */
	INVALID_PATH: "INVALID_PATH",
} as const;

export type StorageErrorCode = typeof StorageErrorCode[keyof typeof StorageErrorCode];

/**
 * Core interface for all storage adapters in the Earlybird SDK.
 *
 * This interface provides a unified API for file operations across different
 * storage backends (in-memory, Capacitor, etc.). All methods are async and
 * return Results instead of throwing errors.
 *
 * @example
 * ```typescript
 * const adapter: StorageAdapter = createInMemoryStorageAdapter();
 *
 * // Write and read a file
 * const writeResult = await adapter.write('config.json', '{"theme": "dark"}');
 * if (writeResult.success) {
 *   const readResult = await adapter.read('config.json');
 *   if (readResult.success) {
 *     console.log('Content:', readResult.value);
 *   }
 * }
 * ```
 */
export interface StorageAdapter {
	/**
	 * Reads the content of a file at the specified path.
	 *
	 * @param path - The file path to read from
	 * @returns Promise that resolves to Result containing file content or null if file doesn't exist
	 *
	 * @example
	 * ```typescript
	 * const result = await adapter.read('data/user.json');
	 * if (result.success && result.value !== null) {
	 *   const user = JSON.parse(result.value);
	 * }
	 * ```
	 */
	read(path: string): Promise<Result<string | null, StorageErrorCode>>;

	/**
	 * Writes content to a file at the specified path.
	 * Creates the file if it doesn't exist, overwrites if it does.
	 *
	 * @param path - The file path to write to
	 * @param content - The string content to write
	 * @returns Promise that resolves to Result indicating success or failure
	 *
	 * @example
	 * ```typescript
	 * const result = await adapter.write('config.json', JSON.stringify({ theme: 'dark' }));
	 * if (result.success) {
	 *   console.log('File written successfully');
	 * }
	 * ```
	 */
	write(path: string, content: string): Promise<Result<void, StorageErrorCode>>;

	/**
	 * Deletes the file at the specified path.
	 *
	 * @param path - The file path to delete
	 * @returns Promise that resolves to Result indicating success or failure
	 *
	 * @example
	 * ```typescript
	 * const result = await adapter.delete('temp/cache.json');
	 * if (!result.success && result.error === StorageErrorCode.NOT_FOUND) {
	 *   console.log('File was already deleted');
	 * }
	 * ```
	 */
	delete(path: string): Promise<Result<void, StorageErrorCode>>;

	/**
	 * Checks if a file exists at the specified path.
	 *
	 * @param path - The file path to check
	 * @returns Promise that resolves to Result containing boolean existence check
	 *
	 * @example
	 * ```typescript
	 * const result = await adapter.exists('config.json');
	 * if (result.success && result.value) {
	 *   console.log('File exists');
	 * }
	 * ```
	 */
	exists(path: string): Promise<Result<boolean, StorageErrorCode>>;

	/**
	 * Lists all files in the specified directory.
	 *
	 * @param directory - The directory path to list (use empty string or '.' for root)
	 * @returns Promise that resolves to Result containing array of file paths
	 *
	 * @example
	 * ```typescript
	 * const result = await adapter.list('data');
	 * if (result.success) {
	 *   console.log('Files in data directory:', result.value);
	 * }
	 * ```
	 */
	list(directory: string): Promise<Result<string[], StorageErrorCode>>;
}
