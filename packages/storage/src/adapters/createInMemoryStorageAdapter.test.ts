import { describe, expect, test } from "vitest";
import { createInMemoryStorageAdapter } from "./createInMemoryStorageAdapter.js";
import { createStorageAdapterTests } from "../storageAdapter.test.js";

// Run the generic StorageAdapter test suite
createStorageAdapterTests(
	() => createInMemoryStorageAdapter(),
	"InMemoryStorageAdapter",
);

// Additional tests specific to InMemoryStorageAdapter
describe("InMemoryStorageAdapter Specific Tests", () => {
	test("memory isolation between instances", async () => {
		const adapter1 = createInMemoryStorageAdapter();
		const adapter2 = createInMemoryStorageAdapter();

		await adapter1.write("test.txt", "content1");
		await adapter2.write("test.txt", "content2");

		expect(await adapter1.read("test.txt")).toBe("content1");
		expect(await adapter2.read("test.txt")).toBe("content2");

		// Verify isolation by checking that each adapter only has its own file
		expect(await adapter1.exists("test.txt")).toBe(true);
		expect(await adapter2.exists("test.txt")).toBe(true);
	});
});