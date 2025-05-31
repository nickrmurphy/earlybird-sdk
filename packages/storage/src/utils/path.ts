/**
 * Path utilities for storage operations
 *
 * Provides cross-platform path normalization and validation utilities
 * that can be shared across different storage adapter implementations.
 */

import type { Result } from "@earlybird-sdk/core";
import { ok, err } from "@earlybird-sdk/core";
import { StorageErrorCode } from "../storageAdapter";

/**
 * Normalizes a file path for consistent storage operations.
 *
 * - Converts backslashes to forward slashes
 * - Removes leading slashes to prevent absolute paths
 * - Removes trailing slashes
 * - Collapses multiple consecutive slashes
 * - Handles empty paths and current directory references
 *
 * @param path - The path to normalize
 * @returns The normalized path
 *
 * @example
 * ```typescript
 * normalizePath('\\data\\file.txt') // 'data/file.txt'
 * normalizePath('/data//file.txt') // 'data/file.txt'
 * normalizePath('data/') // 'data'
 * normalizePath('') // ''
 * ```
 */
export function normalizePath(path: string): string {
	if (!path || path === "." || path === "./") {
		return "";
	}

	// Convert backslashes to forward slashes
	let normalized = path.replace(/\\/g, "/");

	// Remove leading slash to prevent absolute paths
	normalized = normalized.replace(/^\/+/, "");

	// Remove trailing slashes
	normalized = normalized.replace(/\/+$/, "");

	// Collapse multiple consecutive slashes
	normalized = normalized.replace(/\/+/g, "/");

	return normalized;
}

/**
 * Validates if a path is acceptable for storage operations.
 *
 * Rejects paths that contain:
 * - Null bytes
 * - Path traversal sequences (../)
 * - Control characters
 *
 * @param path - The path to validate
 * @returns True if the path is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidPath('data/file.txt') // true
 * isValidPath('../../../etc/passwd') // false
 * isValidPath('file\x00.txt') // false
 * ```
 */
export function isValidPath(path: string): boolean {
	if (!path) {
		return true; // Empty path is valid (root directory)
	}

	// Check for null bytes
	if (path.includes("\0")) {
		return false;
	}

	// Check for path traversal
	if (
		path.includes("../") ||
		path.includes("..\\") ||
		path === ".." ||
		path.startsWith("../") ||
		path.startsWith("..\\")
	) {
		return false;
	}

	// Check for control characters (except tab, newline, carriage return which might be in filenames)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Checking for control characters is necessary for validation
	const controlChars = /[\x00-\x08\x0E-\x1F\x7F]/;
	if (controlChars.test(path)) {
		return false;
	}

	return true;
}

/**
 * Extracts the directory portion of a file path.
 *
 * @param path - The file path
 * @returns The directory path, or empty string if no directory
 *
 * @example
 * ```typescript
 * getDirectory('data/user/profile.json') // 'data/user'
 * getDirectory('file.txt') // ''
 * getDirectory('dir/') // 'dir'
 * ```
 */
export function getDirectory(path: string): string {
	const normalized = normalizePath(path);
	const lastSlash = normalized.lastIndexOf("/");

	if (lastSlash === -1) {
		return "";
	}

	return normalized.substring(0, lastSlash);
}

/**
 * Extracts the filename portion of a file path.
 *
 * @param path - The file path
 * @returns The filename, or empty string if path ends with directory separator
 *
 * @example
 * ```typescript
 * getFilename('data/user/profile.json') // 'profile.json'
 * getFilename('file.txt') // 'file.txt'
 * getFilename('dir/') // ''
 * ```
 */
export function getFilename(path: string): string {
	const normalized = normalizePath(path);
	const lastSlash = normalized.lastIndexOf("/");

	if (lastSlash === -1) {
		return normalized;
	}

	return normalized.substring(lastSlash + 1);
}

/**
 * Joins multiple path segments into a single normalized path.
 *
 * @param segments - Path segments to join
 * @returns The joined and normalized path
 *
 * @example
 * ```typescript
 * joinPath('data', 'user', 'profile.json') // 'data/user/profile.json'
 * joinPath('data/', '/user/', 'profile.json') // 'data/user/profile.json'
 * ```
 */
export function joinPath(...segments: string[]): string {
	const joined = segments.filter((segment) => segment !== "").join("/");

	return normalizePath(joined);
}

/**
 * Validates and normalizes a path for storage operations.
 *
 * @param path - The path to validate and normalize
 * @returns Result containing the normalized path or an error
 */
export function validateAndNormalizePath(
	path: string,
): Result<string, StorageErrorCode> {
	const normalizedPath = normalizePath(path);

	if (!isValidPath(normalizedPath)) {
		return err(StorageErrorCode.INVALID_PATH);
	}

	return ok(normalizedPath);
}
