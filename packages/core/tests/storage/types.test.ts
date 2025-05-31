import { expect, test } from "bun:test";
import type { StorageAdapter } from "../../src/storage/StorageAdapter.js";
import { StorageError, StorageErrorCode } from "../../src/storage/errors.js";

// Type-level tests for StorageAdapter interface
test("StorageAdapter interface enforces correct method signatures", () => {
  // Valid implementation should compile
  const validAdapter: StorageAdapter = {
    read: async (path: string): Promise<string | null> => null,
    write: async (path: string, content: string): Promise<void> => {},
    delete: async (path: string): Promise<void> => {},
    exists: async (path: string): Promise<boolean> => false,
    list: async (directory: string): Promise<string[]> => [],
  };

  expect(validAdapter).toBeDefined();
});

test("StorageAdapter methods return correct Promise types", async () => {
  const adapter: StorageAdapter = {
    read: async () => "test content",
    write: async () => {},
    delete: async () => {},
    exists: async () => true,
    list: async () => ["file1.txt", "file2.txt"],
  };

  // Test return types at runtime
  const readResult = await adapter.read("test");
  const writeResult = await adapter.write("test", "content");
  const deleteResult = await adapter.delete("test");
  const existsResult = await adapter.exists("test");
  const listResult = await adapter.list("test");

  // TypeScript should enforce these types
  expect(typeof readResult === "string" || readResult === null).toBe(true);
  expect(writeResult).toBeUndefined();
  expect(deleteResult).toBeUndefined();
  expect(typeof existsResult).toBe("boolean");
  expect(Array.isArray(listResult)).toBe(true);
  expect(listResult.every(item => typeof item === "string")).toBe(true);
});

test("StorageAdapter read method can return null", async () => {
  const adapter: StorageAdapter = {
    read: async () => null,
    write: async () => {},
    delete: async () => {},
    exists: async () => false,
    list: async () => [],
  };

  const result = await adapter.read("nonexistent");
  expect(result).toBeNull();
});

test("StorageError types are properly defined", () => {
  // Test enum values
  const notFound: StorageErrorCode = StorageErrorCode.NOT_FOUND;
  const operationFailed: StorageErrorCode = StorageErrorCode.OPERATION_FAILED;

  expect(notFound).toBe(StorageErrorCode.NOT_FOUND);
  expect(operationFailed).toBe(StorageErrorCode.OPERATION_FAILED);

  // Test error construction
  const error1 = new StorageError("test", StorageErrorCode.NOT_FOUND);
  const error2 = new StorageError("test", StorageErrorCode.OPERATION_FAILED, new Error("cause"));

  expect(error1.code).toBe(StorageErrorCode.NOT_FOUND);
  expect(error2.cause).toBeInstanceOf(Error);
});

test("StorageError factory methods have correct signatures", () => {
  // Test static factory methods
  const notFoundError = StorageError.notFound("/test/path");
  const operationError = StorageError.operationFailed("write operation");
  const errorWithCause = StorageError.operationFailed("read", new Error("disk error"));

  expect(notFoundError.code).toBe(StorageErrorCode.NOT_FOUND);
  expect(operationError.code).toBe(StorageErrorCode.OPERATION_FAILED);
  expect(errorWithCause.cause).toBeInstanceOf(Error);
});
