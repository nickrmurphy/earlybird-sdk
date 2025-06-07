import type { HLC } from "../hlc/types";
import type { StorageAdapter } from "../storage/types";

import { beforeEach, describe, expect, it } from "vitest";
import { all, get, insert, update, where } from "./store";

// Mock storage adapter for testing
const createMockAdapter = (): StorageAdapter => {
  const storage = new Map<string, string>();

  return {
    read: async (path: string) => {
      return storage.get(path) || null;
    },
    write: async (path: string, data: string) => {
      storage.set(path, data);
    },
    list: async (directory: string) => {
      const files: string[] = [];
      for (const path of storage.keys()) {
        if (
          path.startsWith(`${directory}/`) &&
          path.endsWith(".json") &&
          path !== `${directory}/hlc.json`
        ) {
          // Extract just the filename from the full path
          const filename = path.split("/").pop();
          if (filename) {
            files.push(filename);
          }
        }
      }
      return files;
    },
  };
};

type TestUser = {
  id: string;
  name: string;
  age: number;
};

describe("store", () => {
  let adapter: StorageAdapter;
  const testHLC: HLC = "2023-01-01T00:00:01.000Z-000000-test123";
  const basePath = "_store";

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  describe("get", () => {
    it("should return null when document does not exist", async () => {
      const result = await get<TestUser>(adapter, basePath, "users", "user1");

      expect(result).toBe(null);
    });

    it("should return document data when it exists", async () => {
      const document = {
        id: "user1",
        _fields: {
          id: { _hlc: testHLC, _value: "user1" },
          name: { _hlc: testHLC, _value: "John" },
          age: { _hlc: testHLC, _value: 30 },
        },
        _hash: "test-hash",
      };

      await adapter.write("_store/users/user1.json", JSON.stringify(document));

      const result = await get<TestUser>(adapter, basePath, "users", "user1");

      expect(result).toEqual({ id: "user1", name: "John", age: 30 });
    });
  });

  describe("insert", () => {
    it("should create and store a new document", async () => {
      await insert(adapter, testHLC, basePath, "users", "user1", {
        name: "John",
        age: 30,
      });

      const stored = await adapter.read("_store/users/user1.json");
      expect(stored).toBeDefined();

      const document = JSON.parse(stored!);
      expect(document.id).toBe("user1");
      expect(document._fields.name._value).toBe("John");
      expect(document._fields.age._value).toBe(30);
    });
  });

  describe("update", () => {
    it("should throw error when document does not exist", async () => {
      await expect(
        update<TestUser>(adapter, testHLC, basePath, "users", "user1", {
          name: "Jane",
        }),
      ).rejects.toThrow("Document user1 not found");
    });

    it("should update existing document", async () => {
      // First insert a document
      await insert(adapter, testHLC, basePath, "users", "user1", {
        name: "John",
        age: 30,
      });

      // Then update it
      const updatedUser = await update<TestUser>(
        adapter,
        testHLC,
        basePath,
        "users",
        "user1",
        { name: "Jane" },
      );

      expect(updatedUser.name).toBe("Jane");
      expect(updatedUser.age).toBe(30); // Should keep existing age
    });
  });

  describe("all", () => {
    it("should return empty array when no documents exist", async () => {
      const result = await all<TestUser>(adapter, basePath, "users");

      expect(result).toEqual([]);
    });

    it("should return all documents", async () => {
      await insert(adapter, testHLC, basePath, "users", "user1", {
        name: "John",
        age: 30,
      });
      await insert(adapter, testHLC, basePath, "users", "user2", {
        name: "Jane",
        age: 25,
      });

      const result = await all<TestUser>(adapter, basePath, "users");

      expect(result).toHaveLength(2);
      expect(result.find((u) => u.id === "user1")?.name).toBe("John");
      expect(result.find((u) => u.id === "user2")?.name).toBe("Jane");
    });
  });

  describe("where", () => {
    it("should return documents matching predicate", async () => {
      await insert(adapter, testHLC, basePath, "users", "user1", {
        name: "John",
        age: 30,
      });
      await insert(adapter, testHLC, basePath, "users", "user2", {
        name: "Jane",
        age: 25,
      });
      await insert(adapter, testHLC, basePath, "users", "user3", {
        name: "Bob",
        age: 35,
      });

      const result = await where<TestUser>(
        adapter,
        basePath,
        "users",
        (user) => user.age >= 30,
      );

      expect(result).toHaveLength(2);
      expect(result.find((u) => u.name === "John")).toBeDefined();
      expect(result.find((u) => u.name === "Bob")).toBeDefined();
    });
  });
});
