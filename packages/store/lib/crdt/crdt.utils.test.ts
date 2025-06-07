import { describe, expect, it } from "vitest";
import { computeHash } from "./crdt.utils";

describe("crdt utils", () => {
  describe("computeHash (DJB2)", () => {
    it("should produce consistent hash for same input", () => {
      const testData = JSON.stringify({ test: "data", id: "doc1" });
      const hash1 = computeHash(testData);
      const hash2 = computeHash(testData);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("string");
      expect(hash1.length).toBeGreaterThan(0);
    });

    it("should produce different hashes for different inputs", () => {
      const data1 = JSON.stringify({ test: "data1" });
      const data2 = JSON.stringify({ test: "data2" });
      const data3 = JSON.stringify({ different: "structure" });

      const hash1 = computeHash(data1);
      const hash2 = computeHash(data2);
      const hash3 = computeHash(data3);

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });

    it("should handle empty string", () => {
      const hash = computeHash("");
      expect(typeof hash).toBe("string");
      expect(hash).toBe("1505"); // DJB2 hash of empty string should be 5381 in hex
    });

    it("should handle special characters and unicode", () => {
      const data1 = computeHash("Hello, 世界!");
      const data2 = computeHash("Hello, World!");
      const data3 = computeHash("Special chars: @#$%^&*()");

      expect(typeof data1).toBe("string");
      expect(typeof data2).toBe("string");
      expect(typeof data3).toBe("string");
      expect(data1).not.toBe(data2);
      expect(data1).not.toBe(data3);
    });

    it("should produce hexadecimal output", () => {
      const hash = computeHash("test");

      // Should only contain hexadecimal characters (0-9, a-f)
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it("should handle typical CRDT field data", () => {
      const fields = {
        id: {
          _hlc: { physical: 1000, logical: 0, nonce: "test123" },
          _value: "doc1",
        },
        name: {
          _hlc: { physical: 1001, logical: 0, nonce: "test123" },
          _value: "Test Document",
        },
        age: {
          _hlc: { physical: 1002, logical: 0, nonce: "test123" },
          _value: 30,
        },
      };

      const fieldsString = JSON.stringify(fields);
      const hash1 = computeHash(fieldsString);
      const hash2 = computeHash(fieldsString);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("string");
      expect(hash1.length).toBeGreaterThan(0);

      // Test with slightly different data
      const modifiedFields = {
        ...fields,
        name: {
          ...fields.name,
          _value: "Modified Document",
        },
      };

      const modifiedHash = computeHash(JSON.stringify(modifiedFields));
      expect(modifiedHash).not.toBe(hash1);
    });

    it("should be deterministic across multiple calls", () => {
      const testCases = [
        "simple string",
        JSON.stringify({ complex: { nested: { object: true } } }),
        "String with numbers 12345",
        JSON.stringify([1, 2, 3, "array", { mixed: true }]),
      ];

      testCases.forEach((testCase) => {
        const hashes = Array.from({ length: 10 }, () => computeHash(testCase));
        const firstHash = hashes[0];

        hashes.forEach((hash, index) => {
          expect(hash).toBe(firstHash);
        });
      });
    });

    it("should handle large strings efficiently", () => {
      // Create a large JSON string
      const largeObject = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: `item-${i}`,
          value: `value-${i}`,
          timestamp: Date.now() + i,
        })),
      };

      const largeString = JSON.stringify(largeObject);
      const startTime = Date.now();
      const hash = computeHash(largeString);
      const endTime = Date.now();

      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
      // Should complete quickly (less than 100ms for reasonable size)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should produce different hashes for field order changes", () => {
      const fields1 = JSON.stringify({ a: 1, b: 2, c: 3 });
      const fields2 = JSON.stringify({ c: 3, a: 1, b: 2 });

      const hash1 = computeHash(fields1);
      const hash2 = computeHash(fields2);

      // JSON.stringify produces different strings for different key orders
      // so the hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it("benchmark: should hash 10000 documents efficiently", () => {
      // Generate 10000 test documents with realistic CRDT structure
      const documents = Array.from({ length: 10000 }, (_, i) => {
        return JSON.stringify({
          id: {
            _hlc: { physical: Date.now() + i, logical: 0, nonce: `test-${i}` },
            _value: `doc-${i}`,
          },
          title: {
            _hlc: {
              physical: Date.now() + i + 1,
              logical: 0,
              nonce: `test-${i}`,
            },
            _value: `Document Title ${i}`,
          },
          content: {
            _hlc: {
              physical: Date.now() + i + 2,
              logical: 0,
              nonce: `test-${i}`,
            },
            _value: `This is the content of document ${i}. It contains some sample text to make the document more realistic for benchmarking purposes. Document ${i} has been created for testing the hash function performance.`,
          },
          tags: {
            _hlc: {
              physical: Date.now() + i + 3,
              logical: 0,
              nonce: `test-${i}`,
            },
            _value: [`tag-${i % 5}`, `category-${i % 10}`, `type-${i % 3}`],
          },
          metadata: {
            _hlc: {
              physical: Date.now() + i + 4,
              logical: 0,
              nonce: `test-${i}`,
            },
            _value: {
              created: Date.now() + i,
              modified: Date.now() + i + 100,
              version: i + 1,
              author: `user-${i % 20}`,
            },
          },
        });
      });

      console.log(`\n📊 Benchmark: Hashing ${documents.length} documents`);
      console.log(
        `Average document size: ${Math.round(documents[0].length)} characters`,
      );

      // Warm up
      documents.slice(0, 10).forEach((doc) => computeHash(doc));

      // Benchmark the hashing process
      const startTime = performance.now();
      const hashes = documents.map((doc) => computeHash(doc));
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTimePerDoc = totalTime / documents.length;
      const docsPerSecond = Math.round(1000 / avgTimePerDoc);

      console.log(`✅ Total time: ${totalTime.toFixed(2)}ms`);
      console.log(
        `⚡ Average time per document: ${avgTimePerDoc.toFixed(3)}ms`,
      );
      console.log(`🚀 Documents per second: ${docsPerSecond.toLocaleString()}`);

      // Verify all hashes were generated successfully
      expect(hashes).toHaveLength(10000);
      expect(
        hashes.every((hash) => typeof hash === "string" && hash.length > 0),
      ).toBe(true);

      // Verify hashes are unique (they should be for our test data)
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(10000);

      // Performance assertions (adjust these thresholds based on your requirements)
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      expect(avgTimePerDoc).toBeLessThan(1); // Should average less than 1ms per document

      // Test that the function is deterministic by re-hashing a sample
      const sampleDoc = documents[Math.floor(Math.random() * documents.length)];
      const originalHash = computeHash(sampleDoc);
      const recomputedHash = computeHash(sampleDoc);
      expect(recomputedHash).toBe(originalHash);
    });
  });
});
