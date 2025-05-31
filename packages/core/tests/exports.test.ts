import { expect, test } from "bun:test";
import type { StorageAdapter } from "../index.js";
import { StorageError, StorageErrorCode } from "../index.js";

test("main package exports are available", () => {
  // Test that we can import from the main package entry point
  expect(StorageError).toBeDefined();
  expect(StorageErrorCode).toBeDefined();
  expect(StorageErrorCode.NOT_FOUND).toBe(StorageErrorCode.NOT_FOUND);
  expect(StorageErrorCode.OPERATION_FAILED).toBe(StorageErrorCode.OPERATION_FAILED);
});

test("StorageAdapter interface is exported from main package", () => {
  // Type-only test - if it compiles, the interface is properly exported
  const mockAdapter: StorageAdapter = {
    read: async () => null,
    write: async () => {},
    delete: async () => {},
    exists: async () => false,
    list: async () => [],
  };

  expect(typeof mockAdapter.read).toBe("function");
});
