import { StorageError } from "../errors.js";
import { validateAndNormalizePath } from "../utils/path.js";
import type { StorageAdapter } from "@/storageAdapter.js";

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
		 * @returns Promise that resolves to the file content as a string, or null if file doesn't exist
		 * @throws {StorageError} When the path is invalid
		 */
		async read(path: string): Promise<string | null> {
			const normalizedPath = validateAndNormalizePath(path);
			return files.get(normalizedPath) ?? null;
		},

		/**
		 * Writes content to a file at the specified path.
		 * Creates the file if it doesn't exist, overwrites if it does.
		 *
		 * @param path - The file path to write to
		 * @param content - The string content to write
		 * @returns Promise that resolves when the write operation completes
		 * @throws {StorageError} When the path is invalid
		 */
		async write(path: string, content: string): Promise<void> {
			const normalizedPath = validateAndNormalizePath(path);

			if (!normalizedPath) {
				throw StorageError.operationFailed("Cannot write to root directory");
			}

			files.set(normalizedPath, content);
		},

		/**
		 * Deletes the file at the specified path.
		 *
		 * @param path - The file path to delete
		 * @returns Promise that resolves when the delete operation completes
		 * @throws {StorageError} When the file doesn't exist or path is invalid
		 */
		async delete(path: string): Promise<void> {
			const normalizedPath = validateAndNormalizePath(path);

			if (!files.has(normalizedPath)) {
				throw StorageError.notFound(path);
			}

			files.delete(normalizedPath);
		},

		/**
		 * Checks if a file exists at the specified path.
		 *
		 * @param path - The file path to check
		 * @returns Promise that resolves to true if the file exists, false otherwise
		 * @throws {StorageError} When the path is invalid
		 */
		async exists(path: string): Promise<boolean> {
			const normalizedPath = validateAndNormalizePath(path);
			return files.has(normalizedPath);
		},

		/**
		 * Lists all files in the specified directory.
		 *
		 * @param directory - The directory path to list (use empty string or '.' for root)
		 * @returns Promise that resolves to an array of file paths within the directory
		 * @throws {StorageError} When the path is invalid
		 */
		async list(directory: string): Promise<string[]> {
			const normalizedDir = validateAndNormalizePath(
				directory,
				"directory path",
			);
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

			return results.sort();
		},
	};
}
