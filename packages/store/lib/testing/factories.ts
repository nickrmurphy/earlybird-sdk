import { z } from 'zod';
import type { DatabaseConfig, EntitySchema } from '../types';

let counter = 0;

export function createTestId(prefix = 'test'): string {
	return `${prefix}-${++counter}-${Date.now()}`;
}

export function createTestUser(
	overrides: Partial<{ id: string; name: string }> = {},
) {
	return {
		id: createTestId('user'),
		name: 'Test User',
		...overrides,
	};
}

export function createTestPost(
	overrides: Partial<{ id: string; title: string; content: string }> = {},
) {
	return {
		id: createTestId('post'),
		title: 'Test Post',
		content: 'Test content',
		...overrides,
	};
}

export const testUserSchema = z.object({
	id: z.string(),
	name: z.string(),
}) as EntitySchema<{ id: string; name: string }>;

export const testPostSchema = z.object({
	id: z.string(),
	title: z.string(),
	content: z.string(),
}) as EntitySchema<{ id: string; title: string; content: string }>;

export function createTestDatabaseConfig(
	overrides: Partial<DatabaseConfig> = {},
): DatabaseConfig {
	return {
		name: `test-db-${Date.now()}-${Math.random()}`,
		version: 1,
		stores: {
			users: testUserSchema,
			posts: testPostSchema,
		},
		...overrides,
	};
}

export function createTestUsers(
	count: number,
): Array<{ id: string; name: string }> {
	return Array.from({ length: count }, (_, i) =>
		createTestUser({ name: `User ${i + 1}` }),
	);
}

export function createTestPosts(
	count: number,
): Array<{ id: string; title: string; content: string }> {
	return Array.from({ length: count }, (_, i) =>
		createTestPost({
			title: `Post ${i + 1}`,
			content: `Content for post ${i + 1}`,
		}),
	);
}
