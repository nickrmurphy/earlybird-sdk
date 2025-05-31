/**
 * Tests for Hybrid Logical Clock implementation
 */

import { test, expect, describe } from "bun:test";
import {
	generateHLC,
	updateHLC,
	compareHLC,
	isNewerHLC,
	isConcurrentHLC,
	createFieldMetadata,
	mergeFieldMetadata,
	mergeDocumentFields,
	createCRDTDocument,
	extractPlainObject,
	getFieldsSince,
	type HybridLogicalClock,
	type CRDTFieldMetadata,
} from "../src/hlc.ts";

describe("HLC Generation", () => {
	test("generateHLC creates valid timestamps", () => {
		const hlc = generateHLC();

		expect(hlc.logical).toBeGreaterThanOrEqual(0);
		expect(hlc.physical).toBeGreaterThan(0);
		expect(hlc.nonce).toHaveLength(6);
		expect(hlc.nonce).toMatch(/^[a-z0-9]+$/);
	});

	test("consecutive HLC generation increments logical counter", () => {
		const hlc1 = generateHLC();
		const hlc2 = generateHLC();

		if (hlc1.physical === hlc2.physical) {
			expect(hlc2.logical).toBeGreaterThan(hlc1.logical);
		}
	});

	test("each HLC has unique nonce", () => {
		const hlcs = Array.from({ length: 100 }, () => generateHLC());
		const nonces = hlcs.map((hlc) => hlc.nonce);
		const uniqueNonces = new Set(nonces);

		expect(uniqueNonces.size).toBe(nonces.length);
	});
});

describe("HLC Comparison", () => {
	test("compareHLC orders by physical time first", () => {
		const older: HybridLogicalClock = {
			logical: 5,
			physical: 1000,
			nonce: "abc123",
		};
		const newer: HybridLogicalClock = {
			logical: 1,
			physical: 2000,
			nonce: "def456",
		};

		expect(compareHLC(newer, older)).toBeGreaterThan(0);
		expect(compareHLC(older, newer)).toBeLessThan(0);
	});

	test("compareHLC orders by logical time when physical is same", () => {
		const first: HybridLogicalClock = {
			logical: 1,
			physical: 1000,
			nonce: "abc123",
		};
		const second: HybridLogicalClock = {
			logical: 2,
			physical: 1000,
			nonce: "def456",
		};

		expect(compareHLC(second, first)).toBeGreaterThan(0);
		expect(compareHLC(first, second)).toBeLessThan(0);
	});

	test("compareHLC orders by nonce when times are equal", () => {
		const first: HybridLogicalClock = {
			logical: 1,
			physical: 1000,
			nonce: "aaa111",
		};
		const second: HybridLogicalClock = {
			logical: 1,
			physical: 1000,
			nonce: "zzz999",
		};

		expect(compareHLC(second, first)).toBeGreaterThan(0);
		expect(compareHLC(first, second)).toBeLessThan(0);
	});

	test("isNewerHLC correctly identifies newer timestamps", () => {
		const older: HybridLogicalClock = {
			logical: 1,
			physical: 1000,
			nonce: "abc123",
		};
		const newer: HybridLogicalClock = {
			logical: 1,
			physical: 2000,
			nonce: "def456",
		};

		expect(isNewerHLC(newer, older)).toBe(true);
		expect(isNewerHLC(older, newer)).toBe(false);
	});

	test("isConcurrentHLC identifies concurrent timestamps", () => {
		const hlc1: HybridLogicalClock = {
			logical: 1,
			physical: 1000,
			nonce: "abc123",
		};
		const hlc2: HybridLogicalClock = {
			logical: 1,
			physical: 1000,
			nonce: "def456",
		};
		const different: HybridLogicalClock = {
			logical: 2,
			physical: 1000,
			nonce: "ghi789",
		};

		expect(isConcurrentHLC(hlc1, hlc2)).toBe(true);
		expect(isConcurrentHLC(hlc1, different)).toBe(false);
	});
});

describe("Field Metadata", () => {
	test("createFieldMetadata wraps value with HLC", () => {
		const value = "test value";
		const field = createFieldMetadata(value);

		expect(field.value).toBe(value);
		expect(field.hlc).toBeDefined();
		expect(field.hlc.logical).toBeGreaterThanOrEqual(0);
		expect(field.hlc.physical).toBeGreaterThan(0);
		expect(field.hlc.nonce).toHaveLength(6);
	});

	test("mergeFieldMetadata keeps newer field", () => {
		const olderField: CRDTFieldMetadata = {
			value: "old value",
			hlc: { logical: 1, physical: 1000, nonce: "abc123" },
		};

		const newerField: CRDTFieldMetadata = {
			value: "new value",
			hlc: { logical: 1, physical: 2000, nonce: "def456" },
		};

		const result = mergeFieldMetadata(olderField, newerField);
		expect(result.value).toBe("new value");
		expect(result.hlc).toEqual(newerField.hlc);
	});

	test("mergeFieldMetadata keeps local field when it is newer", () => {
		const localField: CRDTFieldMetadata = {
			value: "local value",
			hlc: { logical: 1, physical: 2000, nonce: "abc123" },
		};

		const remoteField: CRDTFieldMetadata = {
			value: "remote value",
			hlc: { logical: 1, physical: 1000, nonce: "def456" },
		};

		const result = mergeFieldMetadata(localField, remoteField);
		expect(result.value).toBe("local value");
		expect(result.hlc).toEqual(localField.hlc);
	});
});

describe("Document Operations", () => {
	test("createCRDTDocument creates valid CRDT document", () => {
		const fields = {
			name: "John Doe",
			email: "john@example.com",
			age: 30,
		};

		const doc = createCRDTDocument("user-123", fields);

		expect(doc.id).toBe("user-123");
		expect(doc._version).toBe(1);
		expect(doc._createdAt).toBeGreaterThan(0);
		expect(doc._updatedAt).toBe(doc._createdAt);

		expect(doc.fields.name.value).toBe("John Doe");
		expect(doc.fields.email.value).toBe("john@example.com");
		expect(doc.fields.age.value).toBe(30);

		// All fields should have HLC metadata
		expect(doc.fields.name.hlc).toBeDefined();
		expect(doc.fields.email.hlc).toBeDefined();
		expect(doc.fields.age.hlc).toBeDefined();
	});

	test("extractPlainObject removes CRDT metadata", () => {
		const doc = createCRDTDocument("user-123", {
			name: "John Doe",
			email: "john@example.com",
			age: 30,
		});

		const plain = extractPlainObject(doc);

		expect(plain.id).toBe("user-123");
		expect(plain.name).toBe("John Doe");
		expect(plain.email).toBe("john@example.com");
		expect(plain.age).toBe(30);

		// Should not have CRDT metadata
		expect((plain as any).fields).toBeUndefined();
		expect((plain as any)._version).toBeUndefined();
		expect((plain as any)._createdAt).toBeUndefined();
		expect((plain as any)._updatedAt).toBeUndefined();
	});

	test("mergeDocumentFields combines fields correctly", () => {
		const localFields = {
			name: {
				value: "John Doe",
				hlc: { logical: 1, physical: 1000, nonce: "abc123" },
			},
			email: {
				value: "old@example.com",
				hlc: { logical: 1, physical: 1000, nonce: "def456" },
			},
		};

		const remoteFields = {
			email: {
				value: "new@example.com",
				hlc: { logical: 1, physical: 2000, nonce: "ghi789" },
			},
			age: { value: 30, hlc: { logical: 1, physical: 1500, nonce: "jkl012" } },
		};

		const merged = mergeDocumentFields(localFields, remoteFields);

		// Local name should be kept (no remote version)
		expect(merged.name.value).toBe("John Doe");

		// Remote email should win (newer timestamp)
		expect(merged.email.value).toBe("new@example.com");

		// Remote age should be added (new field)
		expect(merged.age.value).toBe(30);
	});

	test("getFieldsSince filters fields by timestamp", () => {
		const fields = {
			name: {
				value: "John",
				hlc: { logical: 1, physical: 1000, nonce: "abc123" },
			},
			email: {
				value: "john@example.com",
				hlc: { logical: 1, physical: 2000, nonce: "def456" },
			},
			age: { value: 30, hlc: { logical: 1, physical: 3000, nonce: "ghi789" } },
		};

		const sinceHLC: HybridLogicalClock = {
			logical: 1,
			physical: 1500,
			nonce: "xyz999",
		};
		const result = getFieldsSince(fields, sinceHLC);

		// Only email and age should be returned (newer than sinceHLC)
		expect(Object.keys(result)).toEqual(["email", "age"]);
		expect(result.email.value).toBe("john@example.com");
		expect(result.age.value).toBe(30);
		expect(result.name).toBeUndefined();
	});
});

describe("Update HLC State", () => {
	test("updateHLC advances local clock based on remote", () => {
		// Generate baseline HLC
		const baseline = generateHLC();

		// Create remote HLC with higher logical time
		const remoteHLC: HybridLogicalClock = {
			logical: baseline.logical + 10,
			physical: baseline.physical,
			nonce: "remote1",
		};

		// Update should advance local state
		const updated = updateHLC(remoteHLC);

		expect(updated.logical).toBeGreaterThan(remoteHLC.logical);
		expect(updated.physical).toBeGreaterThanOrEqual(remoteHLC.physical);
	});
});
