import { z } from 'zod/v4';

export const recipeSchema = z.object({
	id: z.uuid(),
	title: z.string(),
	description: z.string(),
	ingredients: z.array(
		z.object({
			id: z.uuid(),
			name: z.string(),
		}),
	),
	isDeleted: z.boolean().optional().default(false),
});

export const ingredientSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	isDeleted: z.boolean().optional().default(false),
});

export type Recipe = z.infer<typeof recipeSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
