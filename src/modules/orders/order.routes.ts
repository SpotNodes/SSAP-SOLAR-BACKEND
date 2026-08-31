import { Router } from 'express';
import { Role } from '../../core/auth/roles.js';
import { asyncHandler } from '../../core/http/async-handler.js';
import { authGuard } from '../../core/http/auth.js';
import { rbac } from '../../core/http/rbac.js';
import { validate } from '../../core/http/validate.js';
import { paginationQuerySchema } from '../../core/pagination/pagination.js';
import { cancelOrder, createOrder, getOrder, listOrders } from './order.controller.js';
import { createOrderSchema } from './order.schema.js';

export const ordersRouter = Router();

// CUSTOMER-only, not just "any authenticated principal": placing/reading orders snapshots the
// authenticated user's profile, which only exists for customers — an ADMIN token has no such
// record (admins are a separate collection).
ordersRouter.use(authGuard, rbac(Role.CUSTOMER));

ordersRouter.post('/', validate({ body: createOrderSchema }), asyncHandler(createOrder));
ordersRouter.get('/', validate({ query: paginationQuerySchema }), asyncHandler(listOrders));
ordersRouter.get('/:id', asyncHandler(getOrder));
ordersRouter.post('/:id/cancel', asyncHandler(cancelOrder));
