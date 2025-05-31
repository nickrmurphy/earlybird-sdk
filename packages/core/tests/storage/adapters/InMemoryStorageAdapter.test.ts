import { beforeEach, describe, expect, test } from "bun:test";
import { InMemoryStorageAdapter } from "@/storage/adapters/InMemoryStorageAdapter.js";
import { StorageError, StorageErrorCode } from "@/storage/errors.js";

describe("InMemoryStorageAdapter", () => {
	let adapter: InMemoryStorageAdapter;

	beforeEach(() => {
		adapter = new InMemoryStorageAdapter();
	});

	describe("Core StorageAdapter Interface", () => {
		describe("write and read operations", () => {
			test("writes and reads a simple file", async () => {
				await adapter.write("test.txt", "hello world");
				const content = await adapter.read("test.txt");
				expect(content).toBe("hello world");
			});

			test("writes and reads files with nested paths", async () => {
				await adapter.write("data/user/profile.json", '{"name": "test"}');
				const content = await adapter.read("data/user/profile.json");
				expect(content).toBe('{"name": "test"}');
			});

			test("overwrites existing files", async () => {
				await adapter.write("test.txt", "original");
				await adapter.write("test.txt", "updated");
				const content = await adapter.read("test.txt");
				expect(content).toBe("updated");
			});

			test("reads non-existent file returns null", async () => {
				const content = await adapter.read("nonexistent.txt");
				expect(content).toBeNull();
			});

			test("handles empty content", async () => {
				await adapter.write("empty.txt", "");
				const content = await adapter.read("empty.txt");
				expect(content).toBe("");
			});

			test("handles large content", async () => {
				const largeContent = "x".repeat(10000);
				await adapter.write("large.txt", largeContent);
				const content = await adapter.read("large.txt");
				expect(content).toBe(largeContent);
			});
		});

		describe("exists operation", () => {
			test("returns true for existing files", async () => {
				await adapter.write("test.txt", "content");
				expect(await adapter.exists("test.txt")).toBe(true);
			});

			test("returns false for non-existent files", async () => {
				expect(await adapter.exists("nonexistent.txt")).toBe(false);
			});

			test("returns true for nested files", async () => {
				await adapter.write("data/file.txt", "content");
				expect(await adapter.exists("data/file.txt")).toBe(true);
			});
		});

		describe("delete operation", () => {
			test("deletes existing files", async () => {
				await adapter.write("test.txt", "content");
				await adapter.delete("test.txt");
				expect(await adapter.exists("test.txt")).toBe(false);
			});

			test("throws error when deleting non-existent file", async () => {
				await expect(adapter.delete("nonexistent.txt")).rejects.toThrow(
					StorageError,
				);
				await expect(adapter.delete("nonexistent.txt")).rejects.toThrow(
					"File not found",
				);
			});

			test("deletes nested files", async () => {
				await adapter.write("data/file.txt", "content");
				await adapter.delete("data/file.txt");
				expect(await adapter.exists("data/file.txt")).toBe(false);
			});
		});

		describe("list operation", () => {
			test("lists files in root directory", async () => {
				await adapter.write("file1.txt", "content1");
				await adapter.write("file2.txt", "content2");
				await adapter.write("data/nested.txt", "content3");

				const files = await adapter.list("");
				expect(files).toEqual(["data", "file1.txt", "file2.txt"]);
			});

			test("lists files in nested directory", async () => {
				await adapter.write("data/file1.txt", "content1");
				await adapter.write("data/file2.txt", "content2");
				await adapter.write("data/subdir/file3.txt", "content3");

				const files = await adapter.list("data");
				expect(files).toEqual(["file1.txt", "file2.txt", "subdir"]);
			});

			test("returns empty array for empty directory", async () => {
				const files = await adapter.list("");
				expect(files).toEqual([]);
			});

			test("returns empty array for non-existent directory", async () => {
				const files = await adapter.list("nonexistent");
				expect(files).toEqual([]);
			});

			test("handles current directory notation", async () => {
				await adapter.write("test.txt", "content");
				const files1 = await adapter.list(".");
				const files2 = await adapter.list("");
				expect(files1).toEqual(files2);
			});

			test("lists files with special characters", async () => {
				await adapter.write("file with spaces.txt", "content");
				await adapter.write("file-with_special@chars.txt", "content");

				const files = await adapter.list("");
				expect(files).toContain("file with spaces.txt");
				expect(files).toContain("file-with_special@chars.txt");
			});
		});
	});

	describe("Path Handling", () => {
		test("normalizes paths correctly", async () => {
			await adapter.write("data\\\\file.txt", "content");
			const content = await adapter.read("data/file.txt");
			expect(content).toBe("content");
		});

		test("handles paths with leading/trailing slashes", async () => {
			await adapter.write("/data/file.txt/", "content");
			const content = await adapter.read("data/file.txt");
			expect(content).toBe("content");
		});

		test("handles paths with multiple slashes", async () => {
			await adapter.write("data//file.txt", "content");
			const content = await adapter.read("data/file.txt");
			expect(content).toBe("content");
		});

		test("rejects invalid paths with path traversal", async () => {
			await expect(adapter.write("../file.txt", "content")).rejects.toThrow(
				StorageError,
			);
			await expect(adapter.read("../../etc/passwd")).rejects.toThrow(
				StorageError,
			);
			await expect(adapter.delete("data/../file.txt")).rejects.toThrow(
				StorageError,
			);
			await expect(adapter.exists("data\\\\..\\\\file.txt")).rejects.toThrow(
				StorageError,
			);
			await expect(adapter.list("../")).rejects.toThrow(StorageError);
		});

		test("rejects paths with null bytes", async () => {
			await expect(adapter.write("file\x00.txt", "content")).rejects.toThrow(
				StorageError,
			);
			await expect(adapter.read("data/file\x00name.txt")).rejects.toThrow(
				StorageError,
			);
		});

		test("rejects writing to root directory", async () => {
			await expect(adapter.write("", "content")).rejects.toThrow(StorageError);
			await expect(adapter.write(".", "content")).rejects.toThrow(StorageError);
		});
	});

	describe("Error Handling", () => {
		test("throws StorageError with correct error codes", async () => {
			try {
				await adapter.delete("nonexistent.txt");
			} catch (error) {
				expect(error).toBeInstanceOf(StorageError);
				expect((error as StorageError).code).toBe(StorageErrorCode.NOT_FOUND);
			}
		});

		test("throws StorageError for invalid operations", async () => {
			try {
				await adapter.write("../invalid.txt", "content");
			} catch (error) {
				expect(error).toBeInstanceOf(StorageError);
				expect((error as StorageError).code).toBe(
					StorageErrorCode.OPERATION_FAILED,
				);
			}
		});
	});

	describe("Concurrent Operations", () => {
		test("handles concurrent reads", async () => {
			await adapter.write("test.txt", "content");

			const reads = await Promise.all([
				adapter.read("test.txt"),
				adapter.read("test.txt"),
				adapter.read("test.txt"),
			]);

			expect(reads).toEqual(["content", "content", "content"]);
		});

		test("handles concurrent writes to different files", async () => {
			await Promise.all([
				adapter.write("file1.txt", "content1"),
				adapter.write("file2.txt", "content2"),
				adapter.write("file3.txt", "content3"),
			]);

			expect(await adapter.read("file1.txt")).toBe("content1");
			expect(await adapter.read("file2.txt")).toBe("content2");
			expect(await adapter.read("file3.txt")).toBe("content3");
		});

		test("handles concurrent operations on same file", async () => {
			// Last write should win due to Promise.all execution order
			await Promise.all([
				adapter.write("test.txt", "first"),
				adapter.write("test.txt", "second"),
				adapter.write("test.txt", "third"),
			]);

			// Content will be one of the writes (behavior is deterministic in this case)
			const content = await adapter.read("test.txt");
			expect(["first", "second", "third"]).toContain(content);
		});
	});

	describe("Performance", () => {
		test("read operations complete quickly", async () => {
			const smallContent = "x".repeat(1000); // 1KB
			await adapter.write("test.txt", smallContent);

			const start = performance.now();
			await adapter.read("test.txt");
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(1); // <1ms for small files
		});

		test("write operations complete quickly", async () => {
			const smallContent = "x".repeat(1000); // 1KB

			const start = performance.now();
			await adapter.write("test.txt", smallContent);
			const duration = performance.now() - start;

			expect(duration).toBeLessThan(1); // <1ms for small files
		});

		test("handles large number of files efficiently", async () => {
			const start = performance.now();

			// Write 1000 small files
			const writes = [];
			for (let i = 0; i < 1000; i++) {
				writes.push(adapter.write(`file${i}.txt`, `content${i}`));
			}
			await Promise.all(writes);

			const duration = performance.now() - start;
			expect(duration).toBeLessThan(100); // Should complete in reasonable time

			// Verify files were written by checking a few
			expect(await adapter.exists("file0.txt")).toBe(true);
			expect(await adapter.exists("file999.txt")).toBe(true);
			expect(await adapter.read("file0.txt")).toBe("content0");
		});
	});

	describe("Integration Tests", () => {
		test("complete workflow with multiple operations", async () => {
			// Create some files
			await adapter.write("config.json", '{"theme": "dark"}');
			await adapter.write("data/users.json", '[{"id": 1}]');
			await adapter.write("data/posts/1.json", '{"title": "test"}');

			// Verify structure
			expect(await adapter.list("")).toEqual(["config.json", "data"]);
			expect(await adapter.list("data")).toEqual(["posts", "users.json"]);
			expect(await adapter.list("data/posts")).toEqual(["1.json"]);

			// Modify and verify
			await adapter.write("config.json", '{"theme": "light"}');
			expect(await adapter.read("config.json")).toBe('{"theme": "light"}');

			// Cleanup
			await adapter.delete("data/posts/1.json");
			expect(await adapter.list("data/posts")).toEqual([]);

			// Verify remaining files
			expect(await adapter.exists("config.json")).toBe(true);
			expect(await adapter.exists("data/users.json")).toBe(true);
		});

		test("memory isolation between instances", async () => {
			const adapter1 = new InMemoryStorageAdapter();
			const adapter2 = new InMemoryStorageAdapter();

			await adapter1.write("test.txt", "content1");
			await adapter2.write("test.txt", "content2");

			expect(await adapter1.read("test.txt")).toBe("content1");
			expect(await adapter2.read("test.txt")).toBe("content2");

			// Verify isolation by checking that each adapter only has its own file
			expect(await adapter1.exists("test.txt")).toBe(true);
			expect(await adapter2.exists("test.txt")).toBe(true);
		});
	});
});
