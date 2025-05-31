/**
 * Core interface for all storage adapters in the Earlybird SDK.
 *
 * This interface provides a unified API for file operations across different
 * storage backends (in-memory, Capacitor, etc.). All methods are async to
 * accommodate various storage implementations.
 *
 * @example
 * ```typescript
 * const adapter: StorageAdapter = new InMemoryStorageAdapter();
 *
 * // Write and read a file
 * await adapter.write('config.json', '{"theme": "dark"}');
 * const content = await adapter.read('config.json');
 *
 * // Check if file exists
 * if (await adapter.exists('config.json')) {
 *   console.log('Config file found');
 * }
 * ```
 */
export interface StorageAdapter {
  /**
   * Reads the content of a file at the specified path.
   *
   * @param path - The file path to read from
   * @returns Promise that resolves to the file content as a string, or null if file doesn't exist
   * @throws {StorageError} When the operation fails (excluding file not found)
   *
   * @example
   * ```typescript
   * const content = await adapter.read('data/user.json');
   * if (content !== null) {
   *   const user = JSON.parse(content);
   * }
   * ```
   */
  read(path: string): Promise<string | null>;

  /**
   * Writes content to a file at the specified path.
   * Creates the file if it doesn't exist, overwrites if it does.
   *
   * @param path - The file path to write to
   * @param content - The string content to write
   * @returns Promise that resolves when the write operation completes
   * @throws {StorageError} When the operation fails
   *
   * @example
   * ```typescript
   * await adapter.write('config.json', JSON.stringify({ theme: 'dark' }));
   * ```
   */
  write(path: string, content: string): Promise<void>;

  /**
   * Deletes the file at the specified path.
   *
   * @param path - The file path to delete
   * @returns Promise that resolves when the delete operation completes
   * @throws {StorageError} When the operation fails (including file not found)
   *
   * @example
   * ```typescript
   * await adapter.delete('temp/cache.json');
   * ```
   */
  delete(path: string): Promise<void>;

  /**
   * Checks if a file exists at the specified path.
   *
   * @param path - The file path to check
   * @returns Promise that resolves to true if the file exists, false otherwise
   * @throws {StorageError} When the operation fails
   *
   * @example
   * ```typescript
   * if (await adapter.exists('config.json')) {
   *   // File exists, safe to read
   * }
   * ```
   */
  exists(path: string): Promise<boolean>;

  /**
   * Lists all files in the specified directory.
   *
   * @param directory - The directory path to list (use empty string or '.' for root)
   * @returns Promise that resolves to an array of file paths within the directory
   * @throws {StorageError} When the operation fails
   *
   * @example
   * ```typescript
   * const files = await adapter.list('data');
   * console.log('Files in data directory:', files);
   * ```
   */
  list(directory: string): Promise<string[]>;
}
