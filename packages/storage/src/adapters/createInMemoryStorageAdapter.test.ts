import { describe, expect, test } from "vitest";
import { createInMemoryStorageAdapter } from "./createInMemoryStorageAdapter.js";

// Additional tests specific to InMemoryStorageAdapter
describe("InMemoryStorageAdapter Specific Tests", () => {
	test("memory isolation between instances", async () => {
		const adapter1 = createInMemoryStorageAdapter();
		const adapter2 = createInMemoryStorageAdapter();

		const writeResult1 = await adapter1.write("test.txt", "content1");
		const writeResult2 = await adapter2.write("test.txt", "content2");

		expect(writeResult1.success).toBe(true);
		expect(writeResult2.success).toBe(true);

		const readResult1 = await adapter1.read("test.txt");
		const readResult2 = await adapter2.read("test.txt");

		expect(readResult1.success).toBe(true);
		if (readResult1.success) {
			expect(readResult1.value).toBe("content1");
		}
		expect(readResult2.success).toBe(true);
		if (readResult2.success) {
			expect(readResult2.value).toBe("content2");
		}

		// Verify isolation by checking that each adapter only has its own file
		const existsResult1 = await adapter1.exists("test.txt");
		const existsResult2 = await adapter2.exists("test.txt");
		expect(existsResult1.success).toBe(true);
		if (existsResult1.success) {
			expect(existsResult1.value).toBe(true);
		}
		expect(existsResult2.success).toBe(true);
		if (existsResult2.success) {
			expect(existsResult2.value).toBe(true);
		}
	});
});