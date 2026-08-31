import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { validate } from '../../core/http/validate.js';
import { getCategories } from './category.controller.js';
import { getProduct, getProducts } from './product.controller.js';
import { productQuerySchema } from './product.schema.js';

// Public / auth-optional (PRD decision D4) — browsing the catalogue never requires a session.
export const catalogRouter = Router();

catalogRouter.get('/categories', asyncHandler(getCategories));
catalogRouter.get('/products', validate({ query: productQuerySchema }), asyncHandler(getProducts));
catalogRouter.get('/products/:id', asyncHandler(getProduct));
