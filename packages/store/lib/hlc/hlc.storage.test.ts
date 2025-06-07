import type { HLC } from "./types";
import type { StorageAdapter } from "../storage/types";

import { beforeEach, describe, expect, it } from "vitest";
import { loadHLC, saveHLC } from "./hlc.storage";

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
          files.push(path);
        }
      }
      return files;
    },
  };
};

describe("HLC Storage", () => {
  let adapter: StorageAdapter;
  const testHLC: HLC = "2023-01-01T00:00:01.000Z-000000-test123";
  const basePath = "_store";

  beforeEach(() => {
    adapter = createMockAdapter();
  });

  describe("loadHLC", () => {
    it("should return a new HLC when no HLC file exists", async () => {
      const hlc = await loadHLC(adapter, basePath, "users");

      expect(hlc).toBeDefined();
      expect(typeof hlc).toBe("string");
      expect(hlc).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z-\d{6}-[a-z0-9]{6}$/,
      );
    });

    it("should load existing HLC from storage", async () => {
      await adapter.write("_store/users.hlc.json", JSON.stringify(testHLC));

      const hlc = await loadHLC(adapter, basePath, "users");

      expect(hlc).toEqual(testHLC);
    });
  });

  describe("saveHLC", () => {
    it("should save HLC to storage", async () => {
      await saveHLC(adapter, basePath, "users", testHLC);

      const content = await adapter.read("_store/users.hlc.json");
      expect(content).toBe(JSON.stringify(testHLC));
    });
  });
});
