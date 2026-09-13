import { z } from 'zod';
import { paginationQuerySchema } from '../../core/pagination/pagination.js';
import { booleanQueryParam } from '../../core/validation/common-schemas.js';

export const productQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
  categoryId: z.string().trim().min(1).optional(),
  inStock: booleanQueryParam,
  // 'newest' sorts by createdAt; 'bestSelling' ranks by units actually sold
  // (see ProductService.search) and falls back to newest for the unsold tail.
  sort: z.enum(['priceLowHigh', 'priceHighLow', 'newest', 'bestSelling']).optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
