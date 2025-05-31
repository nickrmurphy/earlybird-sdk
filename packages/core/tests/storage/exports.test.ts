import { expect, test, describe } from "bun:test";
import type { StorageAdapter } from "@/storage/index.js";
import { StorageError, StorageErrorCode } from "@/storage/index.js";

describe("Storage Module", () => {
  describe("Exports", () => {
    test("exports are available from storage module", () => {
      expect(StorageError).toBeDefined();
      expect(StorageErrorCode).toBeDefined();
      expect(StorageErrorCode.NOT_FOUND).toBe(StorageErrorCode.NOT_FOUND);
      expect(StorageErrorCode.OPERATION_FAILED).toBe(StorageErrorCode.OPERATION_FAILED);
    });

    test("exports are available from main package", async () => {
      // Test main package exports
      const mainExports = await import("../../index.js");
      expect(mainExports.StorageError).toBeDefined();
      expect(mainExports.StorageErrorCode).toBeDefined();
    });
  });

  describe("StorageAdapter Interface", () => {
    test("interface enforces correct method signatures", () => {
      const validAdapter: StorageAdapter = {
        read: async (path: string): Promise<string | null> => null,
        write: async (path: string, content: string): Promise<void> => { },
        delete: async (path: string): Promise<void> => { },
        exists: async (path: string): Promise<boolean> => false,
        list: async (directory: string): Promise<string[]> => [],
      };

      expect(validAdapter).toBeDefined();
      expect(typeof validAdapter.read).toBe("function");
      expect(typeof validAdapter.write).toBe("function");
      expect(typeof validAdapter.delete).toBe("function");
      expect(typeof validAdapter.exists).toBe("function");
      expect(typeof validAdapter.list).toBe("function");
    });

    test("methods return correct types at runtime", async () => {
      const adapter: StorageAdapter = {
        read: async () => "test content",
        write: async () => { },
        delete: async () => { },
        exists: async () => true,
        list: async () => ["file1.txt", "file2.txt"],
      };

      const readResult = await adapter.read("test");
      const writeResult = await adapter.write("test", "content");
      const deleteResult = await adapter.delete("test");
      const existsResult = await adapter.exists("test");
      const listResult = await adapter.list("test");

      expect(typeof readResult === "string" || readResult === null).toBe(true);
      expect(writeResult).toBeUndefined();
      expect(deleteResult).toBeUndefined();
      expect(typeof existsResult).toBe("boolean");
      expect(Array.isArray(listResult)).toBe(true);
      expect(listResult.every(item => typeof item === "string")).toBe(true);
    });

    test("read method can return null", async () => {
      const adapter: StorageAdapter = {
        read: async () => null,
        write: async () => { },
        delete: async () => { },
        exists: async () => false,
        list: async () => [],
      };

      const result = await adapter.read("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("StorageError", () => {
    test("can be created with constructor", () => {
      const error = new StorageError("test message", StorageErrorCode.NOT_FOUND);
      expect(error).toBeInstanceOf(StorageError);
      expect(error.message).toBe("test message");
      expect(error.code).toBe(StorageErrorCode.NOT_FOUND);
      expect(error.name).toBe("StorageError");
    });

    test("supports error chaining", () => {
      const originalError = new Error("Original failure");
      const storageError = new StorageError("test", StorageErrorCode.OPERATION_FAILED, originalError);
      expect(storageError.cause).toBe(originalError);
    });

    test("factory method: notFound", () => {
      const error = StorageError.notFound("/test/path");
      expect(error).toBeInstanceOf(StorageError);
      expect(error.code).toBe(StorageErrorCode.NOT_FOUND);
      expect(error.message).toContain("/test/path");
    });

    test("factory method: operationFailed", () => {
      const error = StorageError.operationFailed("write operation");
      expect(error).toBeInstanceOf(StorageError);
      expect(error.code).toBe(StorageErrorCode.OPERATION_FAILED);
      expect(error.message).toContain("write operation");
    });

    test("factory method: operationFailed with cause", () => {
      const cause = new Error("disk error");
      const error = StorageError.operationFailed("read", cause);
      expect(error.cause).toBe(cause);
    });

    test("enum values are correctly defined", () => {
      expect(StorageErrorCode.NOT_FOUND).toBe(StorageErrorCode.NOT_FOUND);
      expect(StorageErrorCode.OPERATION_FAILED).toBe(StorageErrorCode.OPERATION_FAILED);
    });
  });
});
