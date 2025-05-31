import type { StorageAdapter } from "../StorageAdapter.js";
import { StorageError, StorageErrorCode } from "../errors.js";
import { getDirectory, isValidPath, normalizePath } from "../utils/path.js";

/**
 * In-memory implementation of the StorageAdapter interface.
 *
 * This adapter stores all files in memory using a Map for fast access.
 * It's designed for testing, development, and scenarios where persistence
 * is not required. All data is lost when the instance is garbage collected.
 *
 * @example
 * ```typescript
 * const adapter = new InMemoryStorageAdapter();
 *
 * await adapter.write('config.json', '{"theme": "dark"}');
 * const content = await adapter.read('config.json');
 * console.log(content); // '{"theme": "dark"}'
 *
 * // Clear all data for testing
 * adapter.clear();
 * ```
 */
export class InMemoryStorageAdapter implements StorageAdapter {
	private readonly files = new Map<string, string>();

	/**
	 * Validates and normalizes a path for storage operations.
	 *
	 * @param path - The path to validate and normalize
	 * @param pathType - Description of the path type for error messages (e.g., "path", "directory path")
	 * @returns The normalized path
	 * @throws {StorageError} When the path is invalid
	 */
	private validateAndNormalizePath(path: string, pathType = "path"): string {
		const normalizedPath = normalizePath(path);

		if (!isValidPath(normalizedPath)) {
			throw StorageError.operationFailed(`Invalid ${pathType}: ${path}`);
		}

		return normalizedPath;
	}

	/**
	 * Reads the content of a file at the specified path.
	 *
	 * @param path - The file path to read from
	 * @returns Promise that resolves to the file content as a string, or null if file doesn't exist
	 * @throws {StorageError} When the path is invalid
	 */
	async read(path: string): Promise<string | null> {
		const normalizedPath = this.validateAndNormalizePath(path);

		return this.files.get(normalizedPath) ?? null;
	}

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
		const normalizedPath = this.validateAndNormalizePath(path);

		if (!normalizedPath) {
			throw StorageError.operationFailed("Cannot write to root directory");
		}

		this.files.set(normalizedPath, content);
	}

	/**
	 * Deletes the file at the specified path.
	 *
	 * @param path - The file path to delete
	 * @returns Promise that resolves when the delete operation completes
	 * @throws {StorageError} When the file doesn't exist or path is invalid
	 */
	async delete(path: string): Promise<void> {
		const normalizedPath = this.validateAndNormalizePath(path);

		if (!this.files.has(normalizedPath)) {
			throw StorageError.notFound(path);
		}

		this.files.delete(normalizedPath);
	}

	/**
	 * Checks if a file exists at the specified path.
	 *
	 * @param path - The file path to check
	 * @returns Promise that resolves to true if the file exists, false otherwise
	 * @throws {StorageError} When the path is invalid
	 */
	async exists(path: string): Promise<boolean> {
		const normalizedPath = this.validateAndNormalizePath(path);

		return this.files.has(normalizedPath);
	}

	/**
	 * Lists all files in the specified directory.
	 *
	 * @param directory - The directory path to list (use empty string or '.' for root)
	 * @returns Promise that resolves to an array of file paths within the directory
	 * @throws {StorageError} When the path is invalid
	 */
	async list(directory: string): Promise<string[]> {
		const normalizedDir = this.validateAndNormalizePath(
			directory,
			"directory path",
		);

		const prefix = normalizedDir ? `${normalizedDir}/` : "";
		const results: string[] = [];

		for (const filePath of this.files.keys()) {
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
	}
}
