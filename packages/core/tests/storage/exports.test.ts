import { expect, test } from "bun:test";
import type { StorageAdapter } from "../../src/storage/index.js";
import { StorageError, StorageErrorCode } from "../../src/storage/index.js";

test("storage exports are available", () => {
  // Test that we can import the main exports
  expect(StorageError).toBeDefined();
  expect(StorageErrorCode).toBeDefined();
  expect(StorageErrorCode.NOT_FOUND).toBe(StorageErrorCode.NOT_FOUND);
  expect(StorageErrorCode.OPERATION_FAILED).toBe(StorageErrorCode.OPERATION_FAILED);
});

test("StorageError can be created with factory methods", () => {
  const notFoundError = StorageError.notFound("/test/path");
  expect(notFoundError).toBeInstanceOf(StorageError);
  expect(notFoundError.code).toBe(StorageErrorCode.NOT_FOUND);
  expect(notFoundError.message).toContain("/test/path");

  const operationError = StorageError.operationFailed("write");
  expect(operationError).toBeInstanceOf(StorageError);
  expect(operationError.code).toBe(StorageErrorCode.OPERATION_FAILED);
  expect(operationError.message).toContain("write");
});

test("StorageError supports error chaining", () => {
  const originalError = new Error("Original failure");
  const storageError = StorageError.operationFailed("test", originalError);

  expect(storageError.cause).toBe(originalError);
});

test("StorageAdapter interface type is available", () => {
  // This is a type-only test - if it compiles, the interface is properly exported
  const mockAdapter: StorageAdapter = {
    read: async () => null,
    write: async () => {},
    delete: async () => {},
    exists: async () => false,
    list: async () => [],
  };

  expect(typeof mockAdapter.read).toBe("function");
  expect(typeof mockAdapter.write).toBe("function");
  expect(typeof mockAdapter.delete).toBe("function");
  expect(typeof mockAdapter.exists).toBe("function");
  expect(typeof mockAdapter.list).toBe("function");
});
