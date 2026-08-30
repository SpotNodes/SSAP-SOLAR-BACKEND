import { z } from 'zod';
import type { PaginationMeta } from '../response/envelope.js';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
}

export function toPaginationParams(input: { page: number; pageSize: number }): PaginationParams {
  return { page: input.page, pageSize: input.pageSize, skip: (input.page - 1) * input.pageSize };
}

export function buildMeta(total: number, page: number, pageSize: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
