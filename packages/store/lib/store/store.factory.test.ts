import type { StorageAdapter } from "../storage/types";
import type { OnMutateCallback } from "./types";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "./store.factory";

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

describe("store factory", () => {
  let adapter: StorageAdapter;

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  describe("createStore", () => {
    it("should create a store with all required methods", () => {
      const store = createStore<TestUser>(adapter, "users");

      expect(store.collectionName).toBe("users");
      expect(store.get).toBeTypeOf("function");
      expect(store.insert).toBeTypeOf("function");
      expect(store.update).toBeTypeOf("function");
      expect(store.all).toBeTypeOf("function");
      expect(store.where).toBeTypeOf("function");
      expect(store.getHashes).toBeTypeOf("function");
      expect(store.mergeData).toBeTypeOf("function");
      expect(store.getBuckets).toBeTypeOf("function");
    });

    it("should allow inserting and retrieving data", async () => {
      const store = createStore<TestUser>(adapter, "users");

      await store.insert("user1", { name: "John", age: 30 });
      const user = await store.get("user1");

      expect(user).toEqual({ id: "user1", name: "John", age: 30 });
    });

    it("should allow updating data", async () => {
      const store = createStore<TestUser>(adapter, "users");

      // Insert initial data
      await store.insert("user1", { name: "John", age: 30 });

      // Add a small delay to ensure HLC advancement
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await store.update("user1", { age: 31 });

      expect(updated.age).toBe(31);
      expect(updated.name).toBe("John"); // Should preserve existing fields
    });

    it("should allow querying all data", async () => {
      const store = createStore<TestUser>(adapter, "users");

      await store.insert("user1", { name: "John", age: 30 });
      await store.insert("user2", { name: "Jane", age: 25 });

      const users = await store.all();

      expect(users).toHaveLength(2);
      expect(users.find((u: TestUser) => u.id === "user1")?.name).toBe("John");
      expect(users.find((u: TestUser) => u.id === "user2")?.name).toBe("Jane");
    });

    it("should allow querying with where predicate", async () => {
      const store = createStore<TestUser>(adapter, "users");

      await store.insert("user1", { name: "John", age: 30 });
      await store.insert("user2", { name: "Jane", age: 25 });
      await store.insert("user3", { name: "Bob", age: 35 });

      const olderUsers = await store.where((user: TestUser) => user.age > 29);

      expect(olderUsers).toHaveLength(2);
      expect(olderUsers.find((u: TestUser) => u.name === "John")).toBeDefined();
      expect(olderUsers.find((u: TestUser) => u.name === "Bob")).toBeDefined();
      expect(
        olderUsers.find((u: TestUser) => u.name === "Jane"),
      ).toBeUndefined();
    });
  });

  describe("onMutate callback", () => {
    it("should call onMutate callback on insert operations", async () => {
      const onMutate = vi.fn<OnMutateCallback<TestUser>>();
      const store = createStore<TestUser>(adapter, "users", "_store", onMutate);

      await store.insert("user1", { name: "John", age: 30 });

      expect(onMutate).toHaveBeenCalledWith(
        "insert",
        "user1",
        { id: "user1", name: "John", age: 30 }
      );
    });

    it("should call onMutate callback on update operations", async () => {
      const onMutate = vi.fn<OnMutateCallback<TestUser>>();
      const store = createStore<TestUser>(adapter, "users", "_store", onMutate);

      await store.insert("user1", { name: "John", age: 30 });
      onMutate.mockClear();

      await new Promise((resolve) => setTimeout(resolve, 10));
      await store.update("user1", { age: 31 });

      expect(onMutate).toHaveBeenCalledWith(
        "update",
        "user1",
        expect.objectContaining({ id: "user1", name: "John", age: 31 })
      );
    });

    it("should not call onMutate when callback is not provided", async () => {
      const store = createStore<TestUser>(adapter, "users");

      await store.insert("user1", { name: "John", age: 30 });
      await store.update("user1", { age: 31 });

      // Should not throw any errors
      expect(true).toBe(true);
    });
  });
});
