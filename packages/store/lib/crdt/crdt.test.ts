import type { HLC } from "../hlc/types";

import { describe, expect, it } from "vitest";
import {
  makeDocument,
  mergeDocument,
  mergeFields,
  readDocument,
} from "../crdt";

describe("crdt", () => {
  const testHLC: HLC = "2023-01-01T00:00:01.000Z-000000-test123";

  describe("mergeFields", () => {
    it("should keep current field when it has newer HLC", () => {
      // Create fields directly with deterministic HLCs instead of using makeField
      const olderField = {
        _hlc: "2023-01-01T00:00:01.000Z-000000-older1",
        _value: "old value",
      };
      const newerField = {
        _hlc: "2023-01-01T00:00:02.000Z-000000-newer1",
        _value: "new value",
      };

      // When current field (newerField) is newer than new field (olderField), keep current
      const result = mergeFields(newerField, olderField);
      expect(result._value).toBe("new value"); // newerField should win
    });

    it("should use new field when it has newer HLC", () => {
      // Create fields directly with deterministic HLCs instead of using makeField
      const olderField = {
        _hlc: "2023-01-01T00:00:01.000Z-000000-older2",
        _value: "old value",
      };
      const newerField = {
        _hlc: "2023-01-01T00:00:02.000Z-000000-newer2",
        _value: "new value",
      };

      // When current field (olderField) is older than new field (newerField), use new
      const result = mergeFields(olderField, newerField);
      expect(result._value).toBe("new value"); // newerField should win
    });
  });

  describe("makeDocument", () => {
    it("should create a document with fields", () => {
      const data = { id: "doc1", name: "Test", age: 30 };
      const document = makeDocument(testHLC, "doc1", data);

      expect(document.id).toBe("doc1");
      expect(document._fields.id).toBeDefined();
      expect(document._fields.name).toBeDefined();
      expect(document._fields.age).toBeDefined();
      expect(document._hash).toBeDefined();
      expect(typeof document._hash).toBe("string");
    });
  });

  describe("readDocument", () => {
    it("should read document data", () => {
      const originalData = { id: "doc1", name: "Test", age: 30 };
      const document = makeDocument(testHLC, "doc1", originalData);
      const readData = readDocument(document);

      expect(readData).toEqual(originalData);
    });
  });

  describe("mergeDocument", () => {
    it("should merge documents based on field HLCs", () => {
      // Create documents manually with fully deterministic HLCs
      const oldDocument = {
        id: "doc1",
        _fields: {
          id: {
            _hlc: "2023-01-01T00:00:01.000Z-000000-old-id1",
            _value: "doc1",
          },
          name: {
            _hlc: "2023-01-01T00:00:01.000Z-000001-old-nm1",
            _value: "Old Name",
          },
        },
        _hash: "old-hash",
      };

      const newDocument = {
        id: "doc1",
        _fields: {
          id: {
            _hlc: "2023-01-01T00:00:02.000Z-000000-new-id1",
            _value: "doc1",
          },
          name: {
            _hlc: "2023-01-01T00:00:02.000Z-000001-new-nm1",
            _value: "New Name",
          },
        },
        _hash: "new-hash",
      };

      const result = mergeDocument(oldDocument, newDocument);
      const resultData = readDocument(result);

      expect(resultData.name).toBe("New Name");
    });

    it("should merge individual fields based on their HLC", () => {
      // Create documents with mixed timestamps to test field-level merging
      const docA = {
        id: "doc1",
        _fields: {
          id: {
            _hlc: "2023-01-01T00:00:01.000Z-000000-id-a111",
            _value: "doc1",
          },
          name: {
            _hlc: "2023-01-01T00:00:02.000Z-000000-nm-a111", // newer
            _value: "Name A",
          },
          age: {
            _hlc: "2023-01-01T00:00:01.000Z-000000-ag-a111", // older
            _value: 25,
          },
        },
        _hash: "hash-a",
      };

      const docB = {
        id: "doc1",
        _fields: {
          id: {
            _hlc: "2023-01-01T00:00:01.000Z-000000-id-b111",
            _value: "doc1",
          },
          name: {
            _hlc: "2023-01-01T00:00:01.000Z-000000-nm-b111", // older
            _value: "Name B",
          },
          age: {
            _hlc: "2023-01-01T00:00:02.000Z-000000-ag-b111", // newer
            _value: 30,
          },
        },
        _hash: "hash-b",
      };

      const result = mergeDocument(docA, docB);
      const resultData = readDocument(result);

      expect(resultData.name).toBe("Name A"); // A has newer name timestamp
      expect(resultData.age).toBe(30); // B has newer age timestamp
    });
  });
});
