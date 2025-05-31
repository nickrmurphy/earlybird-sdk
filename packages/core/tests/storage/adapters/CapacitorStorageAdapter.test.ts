/**
 * Unit tests for CapacitorStorageAdapter
 *
 * These tests mock the Capacitor Filesystem plugin to test the adapter's behavior
 * and error handling without requiring a Capacitor environment.
 *
 * Path validation and normalization are tested separately in the path utility tests.
 */

import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import { StorageError, StorageErrorCode } from "@/storage/errors.js";

// Store original module to restore later
// biome-ignore lint/suspicious/noExplicitAny: Use of any to mock originalModule
let originalModule: any;

// Mock the Capacitor Filesystem plugin
const mockFilesystem = {
	// biome-ignore lint/suspicious/noExplicitAny: Use of any to mock readFile
	readFile: mock(() => Promise.resolve({ data: "" as any })),
	writeFile: mock(() => Promise.resolve()),
	deleteFile: mock(() => Promise.resolve()),
	stat: mock(() => Promise.resolve({ type: "file" })),
	// biome-ignore lint/suspicious/noExplicitAny: Use of any[] to mock readdir
	readdir: mock(() => Promise.resolve({ files: [] as any[] })),
};

beforeAll(() => {
	// Store original module if it exists
	try {
		originalModule = require("@capacitor/filesystem");
	} catch (e) {
		// Module doesn't exist, that's fine
	}

	// Mock the Capacitor import
	mock.module("@capacitor/filesystem", () => ({
		Filesystem: mockFilesystem,
		Directory: {
			Data: "DATA",
		},
		Encoding: {
			UTF8: "utf8",
		},
	}));
});

afterAll(() => {
	// Restore original module if needed
	if (originalModule) {
		mock.restore();
	}
});

describe("CapacitorStorageAdapter", () => {
	// biome-ignore lint/suspicious/noExplicitAny: Use of any to mock adapter
	let adapter: any;

	beforeEach(async () => {
		// Reset all mocks before each test
		mockFilesystem.readFile.mockClear();
		mockFilesystem.writeFile.mockClear();
		mockFilesystem.deleteFile.mockClear();
		mockFilesystem.stat.mockClear();
		mockFilesystem.readdir.mockClear();

		// Import the adapter after mocking
		const { CapacitorStorageAdapter } = await import(
			"@/storage/adapters/CapacitorStorageAdapter.js"
		);
		adapter = new CapacitorStorageAdapter();
	});

	describe("read operation", () => {
		test("reads string content from file", async () => {
			const expectedContent = "hello world";
			mockFilesystem.readFile.mockResolvedValue({ data: expectedContent });

			const content = await adapter.read("test.txt");

			expect(content).toBe(expectedContent);
			expect(mockFilesystem.readFile).toHaveBeenCalledWith({
				path: "test.txt",
				directory: "DATA",
				encoding: "utf8",
			});
		});

		test("reads content from nested file path", async () => {
			const expectedContent = '{"name": "test"}';
			mockFilesystem.readFile.mockResolvedValue({ data: expectedContent });

			const content = await adapter.read("data/user/profile.json");

			expect(content).toBe(expectedContent);
			expect(mockFilesystem.readFile).toHaveBeenCalledWith({
				path: "data/user/profile.json",
				directory: "DATA",
				encoding: "utf8",
			});
		});

		test("converts Blob data to text", async () => {
			const expectedContent = "blob content";
			const blob = new Blob([expectedContent], { type: "text/plain" });
			mockFilesystem.readFile.mockResolvedValue({ data: blob });

			const content = await adapter.read("blob.txt");

			expect(content).toBe(expectedContent);
		});

		test("handles null content by throwing StorageError", async () => {
			mockFilesystem.readFile.mockResolvedValue({ data: null });

			await expect(adapter.read("null.txt")).rejects.toThrow(StorageError);
			await expect(adapter.read("null.txt")).rejects.toThrow(
				"Invalid contents at path: null.txt",
			);
		});

		test("handles empty string content", async () => {
			mockFilesystem.readFile.mockResolvedValue({ data: "" });

			const content = await adapter.read("empty.txt");

			expect(content).toBe("");
		});

		test("throws StorageError for invalid content type", async () => {
			mockFilesystem.readFile.mockResolvedValue({
				data: 123 as unknown as string,
			}); // Invalid type for testing

			await expect(adapter.read("invalid.txt")).rejects.toThrow(StorageError);
			await expect(adapter.read("invalid.txt")).rejects.toThrow(
				"Invalid contents at path: invalid.txt",
			);
		});

		test("throws error for invalid path", async () => {
			await expect(adapter.read("../../../etc/passwd")).rejects.toThrow(
				"Invalid path: ../../../etc/passwd",
			);
			expect(mockFilesystem.readFile).not.toHaveBeenCalled();
		});
	});

	describe("write operation", () => {
		test("writes string content to file", async () => {
			const content = "hello world";
			mockFilesystem.writeFile.mockResolvedValue(undefined);

			await adapter.write("test.txt", content);

			expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
				path: "test.txt",
				data: content,
				directory: "DATA",
				encoding: "utf8",
				recursive: true,
			});
		});

		test("writes to nested file path", async () => {
			const content = '{"name": "test"}';
			mockFilesystem.writeFile.mockResolvedValue(undefined);

			await adapter.write("data/user/profile.json", content);

			expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
				path: "data/user/profile.json",
				data: content,
				directory: "DATA",
				encoding: "utf8",
				recursive: true,
			});
		});

		test("handles empty content", async () => {
			mockFilesystem.writeFile.mockResolvedValue(undefined);

			await adapter.write("empty.txt", "");

			expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
				path: "empty.txt",
				data: "",
				directory: "DATA",
				encoding: "utf8",
				recursive: true,
			});
		});

		test("handles large content", async () => {
			const largeContent = "x".repeat(10000);
			mockFilesystem.writeFile.mockResolvedValue(undefined);

			await adapter.write("large.txt", largeContent);

			expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
				path: "large.txt",
				data: largeContent,
				directory: "DATA",
				encoding: "utf8",
				recursive: true,
			});
		});

		test("throws error for invalid path", async () => {
			await expect(
				adapter.write("../../../etc/passwd", "evil"),
			).rejects.toThrow("Invalid path: ../../../etc/passwd");
			expect(mockFilesystem.writeFile).not.toHaveBeenCalled();
		});
	});

	describe("delete operation", () => {
		test("deletes existing file", async () => {
			mockFilesystem.deleteFile.mockResolvedValue(undefined);

			await adapter.delete("test.txt");

			expect(mockFilesystem.deleteFile).toHaveBeenCalledWith({
				path: "test.txt",
				directory: "DATA",
			});
		});

		test("deletes nested file", async () => {
			mockFilesystem.deleteFile.mockResolvedValue(undefined);

			await adapter.delete("data/user/profile.json");

			expect(mockFilesystem.deleteFile).toHaveBeenCalledWith({
				path: "data/user/profile.json",
				directory: "DATA",
			});
		});

		test("throws StorageError when delete fails", async () => {
			const capacitorError = new Error("File not found");
			mockFilesystem.deleteFile.mockRejectedValue(capacitorError);

			await expect(adapter.delete("nonexistent.txt")).rejects.toThrow(
				StorageError,
			);
			await expect(adapter.delete("nonexistent.txt")).rejects.toThrow(
				"Failed to delete file at path: nonexistent.txt",
			);
		});

		test("throws error for invalid path", async () => {
			await expect(adapter.delete("../../../etc/passwd")).rejects.toThrow(
				"Invalid path: ../../../etc/passwd",
			);
			expect(mockFilesystem.deleteFile).not.toHaveBeenCalled();
		});
	});

	describe("exists operation", () => {
		test("returns true for existing file", async () => {
			mockFilesystem.stat.mockResolvedValue({ type: "file" });

			const exists = await adapter.exists("test.txt");

			expect(exists).toBe(true);
			expect(mockFilesystem.stat).toHaveBeenCalledWith({
				path: "test.txt",
				directory: "DATA",
			});
		});

		test("returns true for existing nested file", async () => {
			mockFilesystem.stat.mockResolvedValue({ type: "file" });

			const exists = await adapter.exists("data/user/profile.json");

			expect(exists).toBe(true);
			expect(mockFilesystem.stat).toHaveBeenCalledWith({
				path: "data/user/profile.json",
				directory: "DATA",
			});
		});

		test("returns false for non-existent file", async () => {
			const capacitorError = new Error("File not found");
			mockFilesystem.stat.mockRejectedValue(capacitorError);

			const exists = await adapter.exists("nonexistent.txt");

			expect(exists).toBe(false);
			expect(mockFilesystem.stat).toHaveBeenCalledWith({
				path: "nonexistent.txt",
				directory: "DATA",
			});
		});

		test("throws error for invalid path", async () => {
			await expect(adapter.exists("../../../etc/passwd")).rejects.toThrow(
				"Invalid path: ../../../etc/passwd",
			);
			expect(mockFilesystem.stat).not.toHaveBeenCalled();
		});
	});

	describe("list operation", () => {
		test("lists files in directory", async () => {
			const files = [
				{ name: "file1.txt", type: "file" },
				{ name: "file2.txt", type: "file" },
				{ name: "subdirectory", type: "directory" },
			];
			mockFilesystem.readdir.mockResolvedValue({ files });

			const result = await adapter.list("data");

			expect(result).toEqual(["file1.txt", "file2.txt", "subdirectory"]);
			expect(mockFilesystem.readdir).toHaveBeenCalledWith({
				path: "data",
				directory: "DATA",
			});
		});

		test("lists files in root directory", async () => {
			const files = [
				{ name: "config.json", type: "file" },
				{ name: "data", type: "directory" },
			];
			mockFilesystem.readdir.mockResolvedValue({ files });

			const result = await adapter.list("");

			expect(result).toEqual(["config.json", "data"]);
			expect(mockFilesystem.readdir).toHaveBeenCalledWith({
				path: "",
				directory: "DATA",
			});
		});

		test("returns empty array for empty directory", async () => {
			mockFilesystem.readdir.mockResolvedValue({ files: [] });

			const result = await adapter.list("empty");

			expect(result).toEqual([]);
			expect(mockFilesystem.readdir).toHaveBeenCalledWith({
				path: "empty",
				directory: "DATA",
			});
		});

		test("throws StorageError when listing fails", async () => {
			const capacitorError = new Error("Directory not found");
			mockFilesystem.readdir.mockRejectedValue(capacitorError);

			await expect(adapter.list("nonexistent")).rejects.toThrow(StorageError);
			await expect(adapter.list("nonexistent")).rejects.toThrow(
				"Failed to list files in directory: nonexistent",
			);
		});

		test("throws error for invalid directory path", async () => {
			await expect(adapter.list("../../../etc")).rejects.toThrow(
				"Invalid path: ../../../etc",
			);
			expect(mockFilesystem.readdir).not.toHaveBeenCalled();
		});
	});

	describe("path handling", () => {
		test("calls path normalization and validation", async () => {
			mockFilesystem.readFile.mockResolvedValue({ data: "content" });

			// Test that the adapter uses normalized paths
			await adapter.read("data\\file.txt");

			expect(mockFilesystem.readFile).toHaveBeenCalledWith({
				path: "data/file.txt",
				directory: "DATA",
				encoding: "utf8",
			});
		});

		test("handles Unicode filenames", async () => {
			const unicodePath = "data/文件.txt";
			mockFilesystem.readFile.mockResolvedValue({ data: "content" });

			await adapter.read(unicodePath);

			expect(mockFilesystem.readFile).toHaveBeenCalledWith({
				path: unicodePath,
				directory: "DATA",
				encoding: "utf8",
			});
		});

		test("handles special characters in filenames", async () => {
			const specialPath = "data/file-name_with.special@chars$.txt";
			mockFilesystem.readFile.mockResolvedValue({ data: "content" });

			await adapter.read(specialPath);

			expect(mockFilesystem.readFile).toHaveBeenCalledWith({
				path: specialPath,
				directory: "DATA",
				encoding: "utf8",
			});
		});
	});

	describe("error handling", () => {
		test("path validation errors are regular Error instances", async () => {
			try {
				await adapter.read("../invalid");
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect(error).not.toBeInstanceOf(StorageError);
				expect((error as Error).message).toBe("Invalid path: ../invalid");
			}
		});

		test("Capacitor errors are wrapped in StorageError", async () => {
			const capacitorError = new Error("Capacitor filesystem error");
			mockFilesystem.deleteFile.mockRejectedValue(capacitorError);

			try {
				await adapter.delete("test.txt");
			} catch (error) {
				expect(error).toBeInstanceOf(StorageError);
				expect((error as StorageError).code).toBe(
					StorageErrorCode.OPERATION_FAILED,
				);
				expect((error as StorageError).message).toContain(
					"Failed to delete file at path: test.txt",
				);
			}
		});

		test("Blob conversion errors are propagated appropriately", async () => {
			// Create a mock blob that will fail when .text() is called
			const failingBlob = new Blob(["test"]);
			// Override the text method to fail
			failingBlob.text = mock(() =>
				Promise.reject(new Error("Blob conversion failed")),
			);

			mockFilesystem.readFile.mockResolvedValue({ data: failingBlob });

			await expect(adapter.read("blob.txt")).rejects.toThrow(
				"Blob conversion failed",
			);
		});
	});
});

/**
 * Integration Test Requirements for Capacitor Environment
 *
 * The following tests should be implemented when running in a Capacitor environment:
 *
 * 1. File Operations:
 *    - Write and read text files
 *    - Write and read binary files as text
 *    - Handle large files (>1MB)
 *    - Overwrite existing files
 *    - Handle empty files
 *
 * 2. Directory Operations:
 *    - Create nested directory structures
 *    - List directory contents
 *    - Handle empty directories
 *    - Handle non-existent directories
 *
 * 3. Path Handling:
 *    - Verify path normalization works with actual filesystem
 *    - Test special characters in filenames
 *    - Test Unicode filenames
 *
 * 4. Error Scenarios:
 *    - Permission denied errors
 *    - Disk full scenarios
 *    - Invalid file operations
 *    - Network storage failures (if applicable)
 *
 * 5. Performance:
 *    - Concurrent file operations
 *    - Large file handling
 *    - Many small files
 *
 * 6. Platform-specific:
 *    - iOS filesystem behavior
 *    - Android filesystem behavior
 *    - Different storage locations
 */
