import { z } from 'zod/v4';

export const entrySchema = z.object({
	id: z.string(),
	content: z.string(),
	createdDate: z.iso.datetime(),
	isDeleted: z.boolean().optional().default(false),
});
