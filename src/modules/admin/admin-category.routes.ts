import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { validate } from '../../core/http/validate.js';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
} from './admin-category.controller.js';
import { createCategorySchema, updateCategorySchema } from './admin-category.schema.js';

export const adminCategoryRouter = Router();

adminCategoryRouter.get('/', asyncHandler(listCategories));
adminCategoryRouter.get('/:id', asyncHandler(getCategory));
adminCategoryRouter.post('/', validate({ body: createCategorySchema }), asyncHandler(createCategory));
adminCategoryRouter.patch(
  '/:id',
  validate({ body: updateCategorySchema }),
  asyncHandler(updateCategory),
);
adminCategoryRouter.delete('/:id', asyncHandler(deleteCategory));
