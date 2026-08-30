import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function sendOk<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ data });
}

export function sendPaginated<T>(res: Response, data: T[], meta: PaginationMeta, status = 200): void {
  res.status(status).json({ data, meta });
}
