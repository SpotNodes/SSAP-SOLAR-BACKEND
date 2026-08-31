import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { sendOk } from '../../core/response/envelope.js';
import { toPublicCategory } from './category.mapper.js';

export async function getCategories(_req: Request, res: Response): Promise<void> {
  const categories = await container.categoryService.listActive();
  sendOk(res, categories.map(toPublicCategory));
}
