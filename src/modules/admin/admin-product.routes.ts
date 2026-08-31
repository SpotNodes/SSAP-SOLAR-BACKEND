import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { validate } from '../../core/http/validate.js';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  setProductInventory,
  updateProduct,
} from './admin-product.controller.js';
import {
  adminProductQuerySchema,
  createProductSchema,
  setInventorySchema,
  updateProductSchema,
} from './admin-product.schema.js';

export const adminProductRouter = Router();

adminProductRouter.get('/', validate({ query: adminProductQuerySchema }), asyncHandler(listProducts));
adminProductRouter.get('/:id', asyncHandler(getProduct));
adminProductRouter.post('/', validate({ body: createProductSchema }), asyncHandler(createProduct));
adminProductRouter.patch('/:id', validate({ body: updateProductSchema }), asyncHandler(updateProduct));
adminProductRouter.delete('/:id', asyncHandler(deleteProduct));
adminProductRouter.patch(
  '/:id/inventory',
  validate({ body: setInventorySchema }),
  asyncHandler(setProductInventory),
);
