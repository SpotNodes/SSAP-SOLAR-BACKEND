import { z } from 'zod';

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only.');

export const createCategorySchema = z.object({
  id: slugSchema,
  name: z.string().trim().min(1).max(150),
  iconKey: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = createCategorySchema
  .omit({ id: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
