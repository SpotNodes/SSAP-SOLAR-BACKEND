import { z } from 'zod';
import { paginationQuerySchema } from '../../core/pagination/pagination.js';
import { booleanQueryParam } from '../../core/validation/common-schemas.js';

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only.');

const httpsUrlSchema = z
  .string()
  .url()
  .refine((url) => url.startsWith('https://'), { message: 'Image URLs must be HTTPS.' });

const specSchema = z.object({
  label: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(200),
});

export const createProductSchema = z.object({
  id: slugSchema,
  name: z.string().trim().min(1).max(200),
  images: z.array(httpsUrlSchema).min(1, 'At least one image is required.'),
  price: z.number().int().min(0),
  description: z.string().trim().min(1),
  specs: z.array(specSchema).default([]),
  categoryId: z.string().trim().min(1),
  inventoryQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
});

export const updateProductSchema = createProductSchema
  .omit({ id: true, inventoryQuantity: true, lowStockThreshold: true })
  .partial()
  .extend({ isActive: z.boolean().optional() });

export const setInventorySchema = z
  .object({
    inventoryQuantity: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
  })
  .refine((data) => data.inventoryQuantity !== undefined || data.lowStockThreshold !== undefined, {
    message: 'Provide inventoryQuantity and/or lowStockThreshold.',
  });

export const adminProductQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().trim().min(1).optional(),
  isActive: booleanQueryParam,
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type SetInventoryBody = z.infer<typeof setInventorySchema>;
export type AdminProductQuery = z.infer<typeof adminProductQuerySchema>;
