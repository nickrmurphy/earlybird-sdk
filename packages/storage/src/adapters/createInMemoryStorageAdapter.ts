import { validateAndNormalizePath } from "../utils/path.js";
import type { StorageAdapter } from "../storageAdapter.js";
import type { Result } from "../../../core/src/result.js";
import { ok, err } from "../../../core/src/result.js";
import { StorageErrorCode } from "../storageAdapter.js";

/**
 * Creates an in-memory implementation of the StorageAdapter interface.
 *
 * This adapter stores all files in memory using a Map for fast access.
 * It's designed for testing, development, and scenarios where persistence
 * is not required. All data is lost when the adapter instance is no longer referenced.
 *
 * @returns A new StorageAdapter instance that stores data in memory
 *
 * @example
 * ```typescript
 * const adapter = createInMemoryStorageAdapter();
 *
 * await adapter.write('config.json', '{"theme": "dark"}');
 * const content = await adapter.read('config.json');
 * console.log(content); // '{"theme": "dark"}'
 * ```
 */
export function createInMemoryStorageAdapter(): StorageAdapter {
	const files = new Map<string, string>();

	return {
		/**
		 * Reads the content of a file at the specified path.
		 *
		 * @param path - The file path to read from
		 * @returns Promise that resolves to Result containing file content or null if file doesn't exist
		 */
		async read(path: string): Promise<Result<string | null, StorageErrorCode>> {
			const pathResult = validateAndNormalizePath(path);
			if (!pathResult.success) {
				return err(pathResult.error);
			}
			
			const content = files.get(pathResult.value) ?? null;
			return ok(content);
		},

		/**
		 * Writes content to a file at the specified path.
		 * Creates the file if it doesn't exist, overwrites if it does.
		 *
		 * @param path - The file path to write to
		 * @param content - The string content to write
		 * @returns Promise that resolves to Result indicating success or failure
		 */
		async write(path: string, content: string): Promise<Result<void, StorageErrorCode>> {
			const pathResult = validateAndNormalizePath(path);
			if (!pathResult.success) {
				return err(pathResult.error);
			}

			if (!pathResult.value) {
				return err(StorageErrorCode.OPERATION_FAILED);
			}

			files.set(pathResult.value, content);
			return ok(undefined);
		},

		/**
		 * Deletes the file at the specified path.
		 *
		 * @param path - The file path to delete
		 * @returns Promise that resolves to Result indicating success or failure
		 */
		async delete(path: string): Promise<Result<void, StorageErrorCode>> {
			const pathResult = validateAndNormalizePath(path);
			if (!pathResult.success) {
				return err(pathResult.error);
			}

			if (!files.has(pathResult.value)) {
				return err(StorageErrorCode.NOT_FOUND);
			}

			files.delete(pathResult.value);
			return ok(undefined);
		},

		/**
		 * Checks if a file exists at the specified path.
		 *
		 * @param path - The file path to check
		 * @returns Promise that resolves to Result containing boolean existence check
		 */
		async exists(path: string): Promise<Result<boolean, StorageErrorCode>> {
			const pathResult = validateAndNormalizePath(path);
			if (!pathResult.success) {
				return err(pathResult.error);
			}
			
			const exists = files.has(pathResult.value);
			return ok(exists);
		},

		/**
		 * Lists all files in the specified directory.
		 *
		 * @param directory - The directory path to list (use empty string or '.' for root)
		 * @returns Promise that resolves to Result containing array of file paths
		 */
		async list(directory: string): Promise<Result<string[], StorageErrorCode>> {
			const pathResult = validateAndNormalizePath(directory);
			if (!pathResult.success) {
				return err(pathResult.error);
			}
			
			const normalizedDir = pathResult.value;
			const prefix = normalizedDir ? `${normalizedDir}/` : "";
			const results: string[] = [];

			for (const filePath of files.keys()) {
				if (normalizedDir === "") {
					// Root directory - include files that don't contain any slashes
					// and direct subdirectories (first-level only)
					if (filePath.includes("/")) {
						const firstSlash = filePath.indexOf("/");
						const dirName = filePath.substring(0, firstSlash);
						if (!results.includes(dirName)) {
							results.push(dirName);
						}
					} else {
						results.push(filePath);
					}
				} else {
					// Specific directory - include direct children only
					if (filePath.startsWith(prefix)) {
						const relativePath = filePath.substring(prefix.length);
						if (relativePath.includes("/")) {
							// This is a subdirectory
							const firstSlash = relativePath.indexOf("/");
							const dirName = relativePath.substring(0, firstSlash);
							if (!results.includes(dirName)) {
								results.push(dirName);
							}
						} else {
							// This is a direct file
							results.push(relativePath);
						}
					}
				}
			}

			return ok(results.sort());
		},
	};
}
