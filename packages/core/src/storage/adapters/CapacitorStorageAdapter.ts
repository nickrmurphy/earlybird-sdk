import type { StorageAdapter } from "../StorageAdapter";
import { Filesystem } from '@capacitor/filesystem';
import { isValidPath, normalizePath } from "../utils/path";
import { StorageError } from "../errors";

export class CapacitorStorageAdapter implements StorageAdapter {

    /**
     * Reads the content of a file at the specified path.
     * 
     * @param path - The file path to read from
     * @returns Promise that resolves to the file content as a string, or null if file doesn't exist
     * @throws {StorageError} When the path is invalid
     */
    async read(path: string): Promise<string | null> {
        const normalizedPath = this.getNormalizedPath(path);

        const result = await Filesystem.readFile({
            path: normalizedPath,
        })

        if (typeof result.data === "string") {
            return result.data ?? null;
        } else if (result.data instanceof Blob) {
            return (await result.data.text()) ?? null;
        } else {
            throw StorageError.operationFailed(`Invalid contents at path: ${path}`);
        }
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
        const normalizedPath = this.getNormalizedPath(path);

        await Filesystem.writeFile({
            path: normalizedPath,
            data: content,
            recursive: true
        });
    }

    /**
     * Deletes the file at the specified path.
     *
     *
     * @param path - The file path to delete
     * @returns Promise that resolves when the delete operation completes
     * @throws {StorageError} When the file doesn't exist or path is invalid
     */
    async delete(path: string): Promise<void> {
        const normalizedPath = this.getNormalizedPath(path);

        try {
            await Filesystem.deleteFile({
                path: normalizedPath
            });
        } catch (error) {
            throw StorageError.operationFailed(`Failed to delete file at path: ${path}`);
        }
    }

    /**
     * Checks if a file exists at the specified path.
     *
     * @param path - The file path to check
     * @returns Promise that resolves to true if the file exists, false otherwise
     * @throws {StorageError} When the path is invalid
     */
    async exists(path: string): Promise<boolean> {
        const normalizedPath = this.getNormalizedPath(path);

        try {
            await Filesystem.stat({ path: normalizedPath });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Lists all files in the specified directory.
     *
     * @param directory - The directory path to list files from
     * @returns Promise that resolves to an array of file names in the directory
     * @throws {StorageError} When the directory path is invalid
     */
    async list(directory: string): Promise<string[]> {
        const normalizedDirectory = this.getNormalizedPath(directory);

        try {
            const result = await Filesystem.readdir({ path: normalizedDirectory });
            return result.files.map((file) => file.name);
        } catch (error) {
            throw StorageError.operationFailed(`Failed to list files in directory: ${directory}`);
        }
    }

    private getNormalizedPath(path: string) {
        const normalizedPath = normalizePath(path);

        if (!isValidPath(normalizedPath)) {
            throw new Error(`Invalid path: ${path}`);
        }

        return normalizedPath;
    }
}