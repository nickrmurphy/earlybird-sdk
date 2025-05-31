import type { StorageAdapter } from '../StorageAdapter.js';
import { StorageError, StorageErrorCode } from '../errors.js';
import { normalizePath, isValidPath, getDirectory } from '../utils/path.js';

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
   * Reads the content of a file at the specified path.
   * 
   * @param path - The file path to read from
   * @returns Promise that resolves to the file content as a string, or null if file doesn't exist
   * @throws {StorageError} When the path is invalid
   */
  async read(path: string): Promise<string | null> {
    const normalizedPath = normalizePath(path);
    
    if (!isValidPath(normalizedPath)) {
      throw StorageError.operationFailed(`Invalid path: ${path}`);
    }

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
    const normalizedPath = normalizePath(path);
    
    if (!isValidPath(normalizedPath)) {
      throw StorageError.operationFailed(`Invalid path: ${path}`);
    }

    if (!normalizedPath) {
      throw StorageError.operationFailed('Cannot write to root directory');
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
    const normalizedPath = normalizePath(path);
    
    if (!isValidPath(normalizedPath)) {
      throw StorageError.operationFailed(`Invalid path: ${path}`);
    }

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
    const normalizedPath = normalizePath(path);
    
    if (!isValidPath(normalizedPath)) {
      throw StorageError.operationFailed(`Invalid path: ${path}`);
    }

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
    const normalizedDir = normalizePath(directory);
    
    if (!isValidPath(normalizedDir)) {
      throw StorageError.operationFailed(`Invalid directory path: ${directory}`);
    }

    const prefix = normalizedDir ? `${normalizedDir}/` : '';
    const results: string[] = [];

    for (const filePath of this.files.keys()) {
      if (normalizedDir === '') {
        // Root directory - include files that don't contain any slashes
        // and direct subdirectories (first-level only)
        if (filePath.includes('/')) {
          const firstSlash = filePath.indexOf('/');
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
          if (relativePath.includes('/')) {
            // This is a subdirectory
            const firstSlash = relativePath.indexOf('/');
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

  /**
   * Clears all stored files from memory.
   * This is useful for testing and cleanup scenarios.
   * 
   * @example
   * ```typescript
   * const adapter = new InMemoryStorageAdapter();
   * await adapter.write('test.txt', 'content');
   * adapter.clear();
   * console.log(await adapter.exists('test.txt')); // false
   * ```
   */
  clear(): void {
    this.files.clear();
  }

  /**
   * Gets the current number of files stored in memory.
   * This is useful for testing and monitoring memory usage.
   * 
   * @returns The number of files currently stored
   * 
   * @example
   * ```typescript
   * const adapter = new InMemoryStorageAdapter();
   * console.log(adapter.size()); // 0
   * await adapter.write('test.txt', 'content');
   * console.log(adapter.size()); // 1
   * ```
   */
  size(): number {
    return this.files.size;
  }

  /**
   * Gets all file paths currently stored in memory.
   * This is useful for debugging and testing scenarios.
   * 
   * @returns Array of all file paths
   * 
   * @example
   * ```typescript
   * const adapter = new InMemoryStorageAdapter();
   * await adapter.write('a.txt', 'content');
   * await adapter.write('dir/b.txt', 'content');
   * console.log(adapter.getAllPaths()); // ['a.txt', 'dir/b.txt']
   * ```
   */
  getAllPaths(): string[] {
    return Array.from(this.files.keys()).sort();
  }
}