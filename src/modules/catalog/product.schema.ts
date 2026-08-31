import { z } from 'zod';
import { paginationQuerySchema } from '../../core/pagination/pagination.js';
import { booleanQueryParam } from '../../core/validation/common-schemas.js';

export const productQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().trim().min(1).optional(),
  inStock: booleanQueryParam,
  sort: z.enum(['priceLowHigh', 'priceHighLow']).optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
