import { expect, test } from "bun:test";
import type { StorageAdapter } from "../../src/storage/StorageAdapter.js";
import { StorageError, StorageErrorCode } from "../../src/storage/errors.js";

test("TypeScript enforces StorageAdapter interface constraints", () => {
  // Valid implementation
  const validAdapter: StorageAdapter = {
    read: async (path: string) => "content",
    write: async (path: string, content: string) => {},
    delete: async (path: string) => {},
    exists: async (path: string) => true,
    list: async (directory: string) => ["file1.txt"],
  };

  expect(validAdapter).toBeDefined();

  // The following would cause TypeScript compilation errors:

  // ❌ Missing methods
  // const invalidAdapter1: StorageAdapter = {
  //   read: async () => null
  //   // Missing write, delete, exists, list
  // };

  // ❌ Wrong return type
  // const invalidAdapter2: StorageAdapter = {
  //   read: async () => 123, // Should return string | null
  //   write: async () => {},
  //   delete: async () => {},
  //   exists: async () => true,
  //   list: async () => []
  // };

  // ❌ Wrong parameter types
  // const invalidAdapter3: StorageAdapter = {
  //   read: async (path: number) => null, // path should be string
  //   write: async () => {},
  //   delete: async () => {},
  //   exists: async () => true,
  //   list: async () => []
  // };

  // ❌ Non-async methods
  // const invalidAdapter4: StorageAdapter = {
  //   read: (path: string) => null, // Should be async
  //   write: async () => {},
  //   delete: async () => {},
  //   exists: async () => true,
  //   list: async () => []
  // };
});

test("TypeScript enforces StorageError type constraints", () => {
  // Valid error creation
  const validError = new StorageError("message", StorageErrorCode.NOT_FOUND);
  expect(validError).toBeInstanceOf(StorageError);

  // The following would cause TypeScript compilation errors:

  // ❌ Invalid error code
  // const invalidError1 = new StorageError("message", "INVALID_CODE");

  // ❌ Wrong parameter types
  // const invalidError2 = new StorageError(123, StorageErrorCode.NOT_FOUND);

  // ❌ Invalid enum usage
  // const invalidCode: StorageErrorCode = "SOME_OTHER_CODE";
});

test("Type-only imports work correctly", () => {
  // This test verifies that our type-only exports work
  // If StorageAdapter wasn't properly exported as a type,
  // this would fail at compile time

  const implementAdapter = (adapter: StorageAdapter) => {
    return adapter;
  };

  const mockAdapter: StorageAdapter = {
    read: async () => null,
    write: async () => {},
    delete: async () => {},
    exists: async () => false,
    list: async () => [],
  };

  expect(implementAdapter(mockAdapter)).toBe(mockAdapter);
});
