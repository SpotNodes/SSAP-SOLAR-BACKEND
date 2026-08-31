import { Router } from 'express';
import { asyncHandler } from '../../core/http/async-handler.js';
import { validate } from '../../core/http/validate.js';
import { getOrder, listOrders, updateOrderPayment, updateOrderStatus } from './admin-order.controller.js';
import { adminOrderQuerySchema, updateOrderPaymentSchema, updateOrderStatusSchema } from './admin-order.schema.js';

export const adminOrderRouter = Router();

adminOrderRouter.get('/', validate({ query: adminOrderQuerySchema }), asyncHandler(listOrders));
adminOrderRouter.get('/:id', asyncHandler(getOrder));
adminOrderRouter.patch(
  '/:id/status',
  validate({ body: updateOrderStatusSchema }),
  asyncHandler(updateOrderStatus),
);
adminOrderRouter.patch(
  '/:id/payment',
  validate({ body: updateOrderPaymentSchema }),
  asyncHandler(updateOrderPayment),
);
