import type { Request, Response } from 'express';
import { container } from '../../container.js';
import { sendOk } from '../../core/response/envelope.js';
import type { CreateCategoryBody, UpdateCategoryBody } from './admin-category.schema.js';

export async function listCategories(_req: Request, res: Response): Promise<void> {
  const categories = await container.adminCategoryService.listAll();
  sendOk(res, categories);
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  const category = await container.adminCategoryService.getById(req.params.id as string);
  sendOk(res, category);
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateCategoryBody;
  const category = await container.adminCategoryService.create(body);
  sendOk(res, category, 201);
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateCategoryBody;
  const category = await container.adminCategoryService.update(req.params.id as string, body);
  sendOk(res, category);
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  await container.adminCategoryService.softDelete(req.params.id as string);
  res.status(204).end();
}
