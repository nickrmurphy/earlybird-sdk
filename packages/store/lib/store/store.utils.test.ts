import { describe, expect, it } from "vitest";
import type { Data, Document } from "../crdt/types";
import {
  createFilePath,
  createCollectionPath,
  deserializeDocument,
  serializeDocument,
  parseDocumentContent,
  prepareInsertDocument,
  filterDefinedValues,
  prepareUpdateDocument,
  createLocalDocumentLookup,
  prepareMergeOperation,
  processMergeOperations,
} from "./store.utils";

describe("Store Utilities", () => {
  describe("createFilePath", () => {
    it("should create correct file path for document", () => {
      const result = createFilePath("_store", "todos", "123");
      expect(result).toBe("_store/todos/123.json");
    });

    it("should handle nested base paths", () => {
      const result = createFilePath("data/_store", "users", "user-456");
      expect(result).toBe("data/_store/users/user-456.json");
    });

    it("should handle special characters in IDs", () => {
      const result = createFilePath(
        "_store",
        "items",
        "item_with-special.chars",
      );
      expect(result).toBe("_store/items/item_with-special.chars.json");
    });
  });

  describe("createCollectionPath", () => {
    it("should create correct collection path", () => {
      const result = createCollectionPath("_store", "todos");
      expect(result).toBe("_store/todos");
    });

    it("should handle nested base paths", () => {
      const result = createCollectionPath("data/_store", "users");
      expect(result).toBe("data/_store/users");
    });

    it("should handle collection names with special characters", () => {
      const result = createCollectionPath(
        "_store",
        "collection-name_with.chars",
      );
      expect(result).toBe("_store/collection-name_with.chars");
    });
  });

  describe("deserializeDocument", () => {
    type TestTodo = Data & {
      title: string;
      completed: boolean;
    };

    it("should parse valid JSON document", () => {
      const docContent = JSON.stringify({
        id: "test-id",
        _fields: {
          id: {
            _hlc: "2024-01-01T00:00:00.000Z-000000-abc123",
            _value: "test-id",
          },
          title: {
            _hlc: "2024-01-01T00:00:00.000Z-000000-abc123",
            _value: "Test Todo",
          },
          completed: {
            _hlc: "2024-01-01T00:00:00.000Z-000000-def456",
            _value: false,
          },
        },
        _hash: "abc123",
      });

      const result = deserializeDocument<TestTodo>(docContent);
      expect(result.id).toBe("test-id");
      expect(result._fields.title._value).toBe("Test Todo");
      expect(result._fields.completed._value).toBe(false);
      expect(result._hash).toBe("abc123");
    });

    it("should throw error for invalid JSON", () => {
      const invalidJson = "{ invalid json }";
      expect(() => deserializeDocument<TestTodo>(invalidJson)).toThrow();
    });

    it("should preserve all document properties", () => {
      type TestDoc = Data & {
        prop1: string;
        prop2: number;
      };

      const doc = {
        id: "123",
        _fields: {
          id: { _hlc: "hlc1", _value: "123" },
          prop1: { _hlc: "hlc1", _value: "value1" },
          prop2: { _hlc: "hlc2", _value: 42 },
        },
        _hash: "hash123",
      };
      const serialized = JSON.stringify(doc);
      const deserialized = deserializeDocument<TestDoc>(serialized);

      expect(deserialized).toEqual(doc);
    });
  });

  describe("serializeDocument", () => {
    type TestTodo = Data & {
      title: string;
      completed: boolean;
    };

    it("should serialize document to JSON string", () => {
      const doc: Document<TestTodo> = {
        id: "test-id",
        _fields: {
          id: {
            _hlc: "2024-01-01T00:00:00.000Z-000000-abc123",
            _value: "test-id",
          },
          title: {
            _hlc: "2024-01-01T00:00:00.000Z-000000-abc123",
            _value: "Test Todo",
          },
          completed: {
            _hlc: "2024-01-01T00:00:00.000Z-000000-def456",
            _value: false,
          },
        },
        _hash: "abc123",
      };

      const result = serializeDocument(doc);
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe("test-id");
      expect(parsed._fields.title._value).toBe("Test Todo");
      expect(parsed._fields.completed._value).toBe(false);
      expect(parsed._hash).toBe("abc123");
    });

    it("should handle complex nested data", () => {
      type ComplexDoc = Data & {
        metadata: { tags: string[]; count: number };
      };

      const doc: Document<ComplexDoc> = {
        id: "complex-doc",
        _fields: {
          id: { _hlc: "hlc1", _value: "complex-doc" },
          metadata: {
            _hlc: "hlc2",
            _value: { tags: ["tag1", "tag2"], count: 42 },
          },
        },
        _hash: "complex-hash",
      };

      const serialized = serializeDocument(doc);
      const deserialized = JSON.parse(serialized);

      expect(deserialized._fields.metadata._value.tags).toEqual([
        "tag1",
        "tag2",
      ]);
      expect(deserialized._fields.metadata._value.count).toBe(42);
    });

    it("should round-trip correctly with deserializeDocument", () => {
      type PersonDoc = Data & {
        name: string;
        age: number;
      };

      const originalDoc: Document<PersonDoc> = {
        id: "roundtrip-test",
        _fields: {
          id: { _hlc: "hlc1", _value: "roundtrip-test" },
          name: { _hlc: "hlc2", _value: "John Doe" },
          age: { _hlc: "hlc3", _value: 30 },
        },
        _hash: "roundtrip-hash",
      };

      const serialized = serializeDocument(originalDoc);
      const deserialized = deserializeDocument<PersonDoc>(serialized);

      expect(deserialized).toEqual(originalDoc);
    });
  });

  describe("parseDocumentContent", () => {
    type TestTodo = Data & {
      title: string;
      completed: boolean;
    };

    it("should parse document content and return data object", () => {
      const docContent = JSON.stringify({
        id: "test-id",
        _fields: {
          id: {
            _hlc: "2024-01-01T00:00:00.000Z-000000-abc123",
            _value: "test-id",
          },
          title: {
            _hlc: "2024-01-01T00:00:00.000Z-000000-abc123",
            _value: "Test Todo",
          },
          completed: {
            _hlc: "2024-01-01T00:00:00.000Z-000000-def456",
            _value: false,
          },
        },
        _hash: "abc123",
      });

      const result = parseDocumentContent<TestTodo>(docContent);
      
      expect(result.id).toBe("test-id");
      expect(result.title).toBe("Test Todo");
      expect(result.completed).toBe(false);
    });

    it("should handle complex nested data", () => {
      type ComplexDoc = Data & {
        metadata: { tags: string[]; count: number };
      };

      const docContent = JSON.stringify({
        id: "complex-id",
        _fields: {
          id: { _hlc: "hlc1", _value: "complex-id" },
          metadata: { 
            _hlc: "hlc2", 
            _value: { tags: ["tag1", "tag2"], count: 42 } 
          }
        },
        _hash: "complex-hash"
      });

      const result = parseDocumentContent<ComplexDoc>(docContent);
      
      expect(result.id).toBe("complex-id");
      expect(result.metadata.tags).toEqual(["tag1", "tag2"]);
      expect(result.metadata.count).toBe(42);
    });

    it("should throw error for invalid JSON", () => {
      expect(() => parseDocumentContent<TestTodo>("{ invalid json }")).toThrow();
    });
  });

  describe("prepareInsertDocument", () => {
    type TestTodo = Data & {
      title: string;
      completed: boolean;
    };

    it("should create document with correct structure", () => {
      const hlc = "2024-01-01T00:00:00.000Z-000000-abc123";
      const id = "test-todo-1";
      const data = { title: "Test Todo", completed: false };

      const result = prepareInsertDocument<TestTodo>(hlc, id, data);

      expect(result.id).toBe(id);
      expect(result._fields.id._value).toBe(id);
      expect(result._fields.id._hlc).toBe(hlc);
      expect(result._fields.title._value).toBe("Test Todo");
      expect(result._fields.title._hlc).toBe(hlc);
      expect(result._fields.completed._value).toBe(false);
      expect(result._fields.completed._hlc).toBe(hlc);
      expect(typeof result._hash).toBe("string");
    });

    it("should handle complex data types", () => {
      type ComplexDoc = Data & {
        metadata: { tags: string[]; count: number };
        settings: { enabled: boolean };
      };

      const hlc = "2024-01-01T00:00:00.000Z-000000-xyz789";
      const id = "complex-doc-1";
      const data = {
        metadata: { tags: ["important", "urgent"], count: 5 },
        settings: { enabled: true }
      };

      const result = prepareInsertDocument<ComplexDoc>(hlc, id, data);

      expect(result.id).toBe(id);
      expect(result._fields.metadata._value.tags).toEqual(["important", "urgent"]);
      expect(result._fields.metadata._value.count).toBe(5);
      expect(result._fields.settings._value.enabled).toBe(true);
      expect(result._fields.metadata._hlc).toBe(hlc);
      expect(result._fields.settings._hlc).toBe(hlc);
    });

    it("should automatically add id to data", () => {
      type SimpleDoc = Data & {
        name: string;
      };

      const hlc = "2024-01-01T00:00:00.000Z-000000-def456";
      const id = "simple-1";
      const data = { name: "Simple Item" };

      const result = prepareInsertDocument<SimpleDoc>(hlc, id, data);

      // The id should be automatically added to the data
      expect(result._fields.id._value).toBe(id);
      expect(result._fields.name._value).toBe("Simple Item");
      expect(Object.keys(result._fields)).toContain("id");
    });
  });

  describe("filterDefinedValues", () => {
    type TestData = Data & {
      title: string;
      completed: boolean;
      priority?: number;
    };

    it("should filter out undefined values", () => {
      const data: Partial<TestData> = {
        id: "test-1",
        title: "Test Todo",
        completed: undefined,
        priority: undefined,
      };

      const result = filterDefinedValues(data);

      expect(result).toEqual({
        id: "test-1",
        title: "Test Todo",
      });
      expect(result.completed).toBeUndefined();
      expect(result.priority).toBeUndefined();
    });

    it("should preserve defined values including falsy ones", () => {
      const data: Partial<TestData> = {
        id: "test-2",
        title: "",
        completed: false,
        priority: 0,
      };

      const result = filterDefinedValues(data);

      expect(result).toEqual({
        id: "test-2",
        title: "",
        completed: false,
        priority: 0,
      });
    });

    it("should handle empty object", () => {
      const data: Partial<TestData> = {};
      const result = filterDefinedValues(data);
      expect(result).toEqual({});
    });

    it("should handle object with all undefined values", () => {
      const data: Partial<TestData> = {
        title: undefined,
        completed: undefined,
        priority: undefined,
      };

      const result = filterDefinedValues(data);
      expect(result).toEqual({});
    });
  });

  describe("prepareUpdateDocument", () => {
    type TestTodo = Data & {
      title: string;
      completed: boolean;
      priority?: number;
    };

    const mockHlc = "2024-01-01T00:00:00.000Z-000000-abc123";

    it("should merge updates with existing document", () => {
      const currentDocument: Document<TestTodo> = {
        id: "todo-1",
        _fields: {
          id: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: "todo-1" },
          title: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: "Old Title" },
          completed: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: false },
        },
        _hash: "old-hash",
      };

      const updateData: Partial<TestTodo> = {
        title: "Updated Title",
        completed: true,
      };

      const result = prepareUpdateDocument(mockHlc, "todo-1", currentDocument, updateData);

      expect(result.mergedData.id).toBe("todo-1");
      expect(result.mergedData.title).toBe("Updated Title");
      expect(result.mergedData.completed).toBe(true);
      expect(result.mergedDocument.id).toBe("todo-1");
      expect(typeof result.mergedDocument._hash).toBe("string");
    });

    it("should filter undefined values before merging", () => {
      const currentDocument: Document<TestTodo> = {
        id: "todo-2",
        _fields: {
          id: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: "todo-2" },
          title: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: "Existing Title" },
          completed: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: false },
        },
        _hash: "old-hash",
      };

      const updateData: Partial<TestTodo> = {
        title: "New Title",
        completed: undefined, // Should be filtered out
        priority: undefined,  // Should be filtered out
      };

      const result = prepareUpdateDocument(mockHlc, "todo-2", currentDocument, updateData);

      // Only title should be updated, completed should remain unchanged
      expect(result.mergedData.title).toBe("New Title");
      expect(result.mergedData.completed).toBe(false); // Original value preserved
    });

    it("should handle partial updates with complex data", () => {
      type ComplexDoc = Data & {
        metadata: { tags: string[]; count: number };
        settings: { enabled: boolean };
      };

      const currentDocument: Document<ComplexDoc> = {
        id: "complex-1",
        _fields: {
          id: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: "complex-1" },
          metadata: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: { tags: ["old"], count: 1 } },
          settings: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: { enabled: false } },
        },
        _hash: "old-hash",
      };

      const updateData: Partial<ComplexDoc> = {
        metadata: { tags: ["new", "updated"], count: 5 },
      };

      const result = prepareUpdateDocument(mockHlc, "complex-1", currentDocument, updateData);

      expect(result.mergedData.metadata.tags).toEqual(["new", "updated"]);
      expect(result.mergedData.metadata.count).toBe(5);
      expect(result.mergedData.settings.enabled).toBe(false); // Should remain unchanged
    });

    it("should preserve id in merged data", () => {
      const currentDocument: Document<TestTodo> = {
        id: "preserve-id",
        _fields: {
          id: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: "preserve-id" },
          title: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: "Original" },
          completed: { _hlc: "2023-01-01T00:00:00.000Z-000000-old123", _value: false },
        },
        _hash: "old-hash",
      };

      const updateData: Partial<TestTodo> = {
        title: "Updated",
      };

      const result = prepareUpdateDocument(mockHlc, "preserve-id", currentDocument, updateData);

      expect(result.mergedData.id).toBe("preserve-id");
      expect(result.mergedDocument.id).toBe("preserve-id");
    });
  });

  describe("createLocalDocumentLookup", () => {
    it("should create set of document IDs from file names", () => {
      const files = ["doc1.json", "doc2.json", "doc3.json"];
      const result = createLocalDocumentLookup(files);

      expect(result).toBeInstanceOf(Set);
      expect(result.has("doc1")).toBe(true);
      expect(result.has("doc2")).toBe(true);
      expect(result.has("doc3")).toBe(true);
      expect(result.has("doc1.json")).toBe(false); // Should remove .json extension
    });

    it("should handle empty files array", () => {
      const files: string[] = [];
      const result = createLocalDocumentLookup(files);

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it("should handle files with special characters", () => {
      const files = ["doc-with-dash.json", "doc_with_underscore.json", "doc.with.dots.json"];
      const result = createLocalDocumentLookup(files);

      expect(result.has("doc-with-dash")).toBe(true);
      expect(result.has("doc_with_underscore")).toBe(true);
      expect(result.has("doc.with.dots")).toBe(true);
    });

    it("should provide O(1) lookup performance", () => {
      const files = Array.from({ length: 1000 }, (_, i) => `doc${i}.json`);
      const result = createLocalDocumentLookup(files);

      expect(result.has("doc500")).toBe(true);
      expect(result.has("doc999")).toBe(true);
      expect(result.has("doc1000")).toBe(false);
    });
  });

  describe("prepareMergeOperation", () => {
    type TestTodo = Data & {
      title: string;
      completed: boolean;
    };

    it("should merge two documents using CRDT logic", () => {
      const localDoc: Document<TestTodo> = {
        id: "merge-test",
        _fields: {
          id: { _hlc: "2023-01-01T00:00:00.000Z-000000-local123", _value: "merge-test" },
          title: { _hlc: "2023-01-01T00:00:00.000Z-000000-local123", _value: "Local Title" },
          completed: { _hlc: "2023-01-01T00:00:00.000Z-000000-local123", _value: false },
        },
        _hash: "local-hash",
      };

      const remoteDoc: Document<TestTodo> = {
        id: "merge-test",
        _fields: {
          id: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote456", _value: "merge-test" },
          title: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote456", _value: "Remote Title" },
          completed: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote456", _value: true },
        },
        _hash: "remote-hash",
      };

      const result = prepareMergeOperation(localDoc, remoteDoc);

      expect(result.id).toBe("merge-test");
      expect(typeof result._hash).toBe("string");
      expect(result._hash).not.toBe("local-hash");
      expect(result._hash).not.toBe("remote-hash");
    });

    it("should handle documents with different field sets", () => {
      type ExtendedTodo = Data & {
        title: string;
        completed: boolean;
        priority?: number;
      };

      const localDoc: Document<ExtendedTodo> = {
        id: "extended-merge",
        _fields: {
          id: { _hlc: "2023-01-01T00:00:00.000Z-000000-local123", _value: "extended-merge" },
          title: { _hlc: "2023-01-01T00:00:00.000Z-000000-local123", _value: "Local Title" },
          completed: { _hlc: "2023-01-01T00:00:00.000Z-000000-local123", _value: false },
        },
        _hash: "local-hash",
      };

      const remoteDoc: Document<ExtendedTodo> = {
        id: "extended-merge",
        _fields: {
          id: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote456", _value: "extended-merge" },
          title: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote456", _value: "Remote Title" },
          priority: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote456", _value: 5 },
        },
        _hash: "remote-hash",
      };

      const result = prepareMergeOperation(localDoc, remoteDoc);

      expect(result.id).toBe("extended-merge");
      expect(typeof result._hash).toBe("string");
      // Should contain fields from both documents
      expect(result._fields.id).toBeDefined();
      expect(result._fields.title).toBeDefined();
      expect(result._fields.completed).toBeDefined();
      expect(result._fields.priority).toBeDefined();
    });
  });

  describe("processMergeOperations", () => {
    type TestTodo = Data & {
      title: string;
      completed: boolean;
    };

    const mockRemoteDoc1: Document<TestTodo> = {
      id: "doc1",
      _fields: {
        id: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote", _value: "doc1" },
        title: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote", _value: "Remote Doc 1" },
        completed: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote", _value: true },
      },
      _hash: "remote-hash-1",
    };

    const mockRemoteDoc2: Document<TestTodo> = {
      id: "doc2",
      _fields: {
        id: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote", _value: "doc2" },
        title: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote", _value: "Remote Doc 2" },
        completed: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote", _value: false },
      },
      _hash: "remote-hash-2",
    };

    const mockRemoteDoc3: Document<TestTodo> = {
      id: "doc3",
      _fields: {
        id: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote", _value: "doc3" },
        title: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote", _value: "Remote Doc 3" },
        completed: { _hlc: "2024-01-01T00:00:00.000Z-000000-remote", _value: true },
      },
      _hash: "remote-hash-3",
    };

    it("should separate merge and add operations correctly", () => {
      const localDocIds = new Set(["doc1", "doc2"]); // doc1 and doc2 exist locally
      const remoteDocuments = {
        doc1: mockRemoteDoc1, // Should merge
        doc2: mockRemoteDoc2, // Should merge
        doc3: mockRemoteDoc3, // Should add
      };

      const result = processMergeOperations(localDocIds, remoteDocuments);

      expect(result.mergeOperations).toHaveLength(2);
      expect(result.addOperations).toHaveLength(1);

      expect(result.mergeOperations[0].docId).toBe("doc1");
      expect(result.mergeOperations[1].docId).toBe("doc2");
      expect(result.addOperations[0].docId).toBe("doc3");

      expect(result.mergeOperations[0].remoteDoc).toBe(mockRemoteDoc1);
      expect(result.mergeOperations[1].remoteDoc).toBe(mockRemoteDoc2);
      expect(result.addOperations[0].remoteDoc).toBe(mockRemoteDoc3);
    });

    it("should handle all merge operations when all docs exist locally", () => {
      const localDocIds = new Set(["doc1", "doc2", "doc3"]);
      const remoteDocuments = {
        doc1: mockRemoteDoc1,
        doc2: mockRemoteDoc2,
        doc3: mockRemoteDoc3,
      };

      const result = processMergeOperations(localDocIds, remoteDocuments);

      expect(result.mergeOperations).toHaveLength(3);
      expect(result.addOperations).toHaveLength(0);
    });

    it("should handle all add operations when no docs exist locally", () => {
      const localDocIds = new Set<string>();
      const remoteDocuments = {
        doc1: mockRemoteDoc1,
        doc2: mockRemoteDoc2,
        doc3: mockRemoteDoc3,
      };

      const result = processMergeOperations(localDocIds, remoteDocuments);

      expect(result.mergeOperations).toHaveLength(0);
      expect(result.addOperations).toHaveLength(3);
    });

    it("should handle empty remote documents", () => {
      const localDocIds = new Set(["doc1", "doc2"]);
      const remoteDocuments: Record<string, Document<TestTodo>> = {};

      const result = processMergeOperations(localDocIds, remoteDocuments);

      expect(result.mergeOperations).toHaveLength(0);
      expect(result.addOperations).toHaveLength(0);
    });

    it("should preserve operation order", () => {
      const localDocIds = new Set(["doc2"]); // Only doc2 exists locally
      const remoteDocuments = {
        doc1: mockRemoteDoc1, // Should add (first)
        doc2: mockRemoteDoc2, // Should merge 
        doc3: mockRemoteDoc3, // Should add (second)
      };

      const result = processMergeOperations(localDocIds, remoteDocuments);

      expect(result.mergeOperations).toHaveLength(1);
      expect(result.addOperations).toHaveLength(2);

      expect(result.mergeOperations[0].docId).toBe("doc2");
      expect(result.addOperations[0].docId).toBe("doc1");
      expect(result.addOperations[1].docId).toBe("doc3");
    });
  });
});
