import { z } from 'zod';
import { paginationQuerySchema } from '../../core/pagination/pagination.js';
import { orderStatusSchema, paymentStatusSchema } from '../orders/order.schema.js';

export const adminOrderQuerySchema = paginationQuerySchema.extend({
  status: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().min(1).max(200).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  note: z.string().trim().min(1).max(500).optional(),
});

export const updateOrderPaymentSchema = z.object({
  paymentStatus: paymentStatusSchema,
});

export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusSchema>;
export type UpdateOrderPaymentBody = z.infer<typeof updateOrderPaymentSchema>;
