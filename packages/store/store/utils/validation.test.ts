import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { standardValidate } from './validation';

describe('standardValidate', () => {
	describe('successful validation', () => {
		it('should return validated value for simple object schema', async () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			});

			const input = { name: 'John', age: 30 };
			const result = await standardValidate(schema, input);

			expect(result).toEqual({ name: 'John', age: 30 });
		});

		it('should return validated value for string schema', async () => {
			const schema = z.string();
			const input = 'test-string';

			const result = await standardValidate(schema, input);

			expect(result).toBe('test-string');
		});

		it('should return validated value for number schema', async () => {
			const schema = z.number();
			const input = 42;

			const result = await standardValidate(schema, input);

			expect(result).toBe(42);
		});

		it('should handle complex nested objects', async () => {
			const schema = z.object({
				user: z.object({
					id: z.number(),
					profile: z.object({
						name: z.string(),
						preferences: z.object({
							theme: z.enum(['light', 'dark']),
							notifications: z.boolean(),
						}),
					}),
				}),
				metadata: z.object({
					createdAt: z.string(),
					updatedAt: z.string(),
				}),
			});

			const input = {
				user: {
					id: 123,
					profile: {
						name: 'Jane',
						preferences: {
							theme: 'dark' as const,
							notifications: true,
						},
					},
				},
				metadata: {
					createdAt: '2024-01-01',
					updatedAt: '2024-01-02',
				},
			};

			const result = await standardValidate(schema, input);

			expect(result).toEqual(input);
		});

		it('should handle array schema', async () => {
			const schema = z.array(
				z.object({
					id: z.number(),
					name: z.string(),
				}),
			);

			const input = [
				{ id: 1, name: 'Item 1' },
				{ id: 2, name: 'Item 2' },
			];

			const result = await standardValidate(schema, input);

			expect(result).toEqual(input);
		});

		it('should handle optional fields', async () => {
			const schema = z.object({
				name: z.string(),
				age: z.number().optional(),
				email: z.string().optional(),
			});

			const input = { name: 'John' };
			const result = await standardValidate(schema, input);

			expect(result).toEqual({ name: 'John' });
		});

		it('should handle default values', async () => {
			const schema = z.object({
				name: z.string(),
				status: z.string().default('active'),
			});

			const input = { name: 'John' };
			const result = await standardValidate(schema, input);

			expect(result).toEqual({ name: 'John', status: 'active' });
		});

		it('should handle transformations', async () => {
			const schema = z.object({
				name: z.string().transform((s) => s.toUpperCase()),
				age: z.string().transform((s) => Number.parseInt(s, 10)),
			});

			const input = { name: 'john', age: '30' };
			const result = await standardValidate(schema, input);

			expect(result).toEqual({ name: 'JOHN', age: 30 });
		});
	});

	describe('validation failures', () => {
		it('should throw error for invalid string', async () => {
			const schema = z.string();
			const input = 123;

			await expect(
				standardValidate(schema, input as unknown as string),
			).rejects.toThrow();
		});

		it('should throw error for missing required field', async () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			});

			const input = { name: 'John' } as unknown as {
				name: string;
				age: number;
			}; // missing age on purpose

			await expect(standardValidate(schema, input)).rejects.toThrow();
		});

		it('should throw error for wrong type', async () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
			});

			const input = { name: 'John', age: 'thirty' } as unknown as {
				name: string;
				age: number;
			}; // age should be number

			await expect(standardValidate(schema, input)).rejects.toThrow();
		});

		it('should format error message as JSON', async () => {
			const schema = z.object({
				email: z.string().email(),
			});

			const input = { email: 'invalid-email' };

			try {
				await standardValidate(schema, input);
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
				expect((error as Error).message).toMatch(/^\[/); // Should start with JSON array
			}
		});

		it('should handle multiple validation errors', async () => {
			const schema = z.object({
				name: z.string().min(2),
				age: z.number().min(0).max(120),
				email: z.string().email(),
			});

			const input = {
				name: 'J', // too short
				age: -5, // negative
				email: 'invalid', // not an email
			};

			try {
				await standardValidate(schema, input);
			} catch (error) {
				const message = (error as Error).message;
				expect(message).toContain('name');
				expect(message).toContain('age');
				expect(message).toContain('email');
			}
		});

		it('should handle nested validation errors', async () => {
			const schema = z.object({
				user: z.object({
					profile: z.object({
						name: z.string().min(1),
					}),
				}),
			});

			const input = {
				user: {
					profile: {
						name: '', // empty string
					},
				},
			};

			await expect(standardValidate(schema, input)).rejects.toThrow();
		});

		it('should handle array validation errors', async () => {
			const schema = z.array(
				z.object({
					id: z.number(),
					name: z.string(),
				}),
			);

			const input = [
				{ id: 1, name: 'Valid' },
				{ id: 'invalid', name: 2 }, // both fields wrong type
			] as unknown as {
				id: number;
				name: string;
			}[];

			await expect(standardValidate(schema, input)).rejects.toThrow();
		});
	});

	describe('edge cases', () => {
		it('should handle null input with nullable schema', async () => {
			const schema = z.string().nullable();
			const input = null;

			const result = await standardValidate(schema, input);

			expect(result).toBeNull();
		});

		it('should handle undefined input with optional schema', async () => {
			const schema = z.string().optional();
			const input = undefined;

			const result = await standardValidate(schema, input);

			expect(result).toBeUndefined();
		});

		it('should handle boolean values', async () => {
			const schema = z.boolean();
			const input = true;

			const result = await standardValidate(schema, input);

			expect(result).toBe(true);
		});

		it('should handle numeric zero', async () => {
			const schema = z.number();
			const input = 0;

			const result = await standardValidate(schema, input);

			expect(result).toBe(0);
		});

		it('should handle empty string', async () => {
			const schema = z.string();
			const input = '';

			const result = await standardValidate(schema, input);

			expect(result).toBe('');
		});

		it('should handle empty object', async () => {
			const schema = z.object({});
			const input = {};

			const result = await standardValidate(schema, input);

			expect(result).toEqual({});
		});

		it('should handle empty array', async () => {
			const schema = z.array(z.string());
			const input: string[] = [];

			const result = await standardValidate(schema, input);

			expect(result).toEqual([]);
		});
	});

	describe('async validation', () => {
		it('should handle async refinements', async () => {
			const schema = z.string().refine(async (val) => {
				// Simulate async validation (e.g., checking if username exists)
				await new Promise((resolve) => setTimeout(resolve, 10));
				return val !== 'taken';
			}, 'Username is already taken');

			const validInput = 'available';
			const result = await standardValidate(schema, validInput);
			expect(result).toBe('available');

			const invalidInput = 'taken';
			await expect(standardValidate(schema, invalidInput)).rejects.toThrow();
		});

		it('should handle complex async transformations', async () => {
			const schema = z.string().transform(async (val) => {
				// Simulate async transformation
				await new Promise((resolve) => setTimeout(resolve, 10));
				return val.toUpperCase();
			});

			const input = 'hello';
			const result = await standardValidate(schema, input);

			expect(result).toBe('HELLO');
		});
	});

	describe('type inference', () => {
		it('should maintain type information through validation', async () => {
			const schema = z.object({
				id: z.number(),
				name: z.string(),
				email: z.string().email(),
				isActive: z.boolean(),
			});

			const input = {
				id: 1,
				name: 'John Doe',
				email: 'john@example.com',
				isActive: true,
			};

			const result = await standardValidate(schema, input);

			// TypeScript should infer the correct type
			expect(typeof result.id).toBe('number');
			expect(typeof result.name).toBe('string');
			expect(typeof result.email).toBe('string');
			expect(typeof result.isActive).toBe('boolean');

			expect(result.id).toBe(1);
			expect(result.name).toBe('John Doe');
			expect(result.email).toBe('john@example.com');
			expect(result.isActive).toBe(true);
		});

		it('should handle union types', async () => {
			const schema = z.union([
				z.object({ type: z.literal('user'), name: z.string() }),
				z.object({
					type: z.literal('admin'),
					permissions: z.array(z.string()),
				}),
			]);

			const userInput = { type: 'user' as const, name: 'John' };
			const userResult = await standardValidate(schema, userInput);
			expect(userResult).toEqual(userInput);

			const adminInput = {
				type: 'admin' as const,
				permissions: ['read', 'write'],
			};
			const adminResult = await standardValidate(schema, adminInput);
			expect(adminResult).toEqual(adminInput);
		});
	});
});
