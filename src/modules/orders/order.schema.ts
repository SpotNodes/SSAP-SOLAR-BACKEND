import { z } from 'zod';
import { OrderStatus, PaymentStatus } from '../../core/enums.js';

// OrderStatus/PaymentStatus are const objects, not TS `enum`s, so z.nativeEnum doesn't apply —
// cast the runtime values to a non-empty tuple to satisfy z.enum's generic constraint.
const orderStatusValues = Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]];
export const orderStatusSchema = z.enum(orderStatusValues);

const paymentStatusValues = Object.values(PaymentStatus) as [PaymentStatus, ...PaymentStatus[]];
export const paymentStatusSchema = z.enum(paymentStatusValues);

export const createOrderSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1, 'Order must contain at least one line.')
    .refine((lines) => new Set(lines.map((line) => line.productId)).size === lines.length, {
      message: 'Duplicate productId in order lines.',
    }),
  // PRD §3.6: accepted via the Idempotency-Key header OR this body field.
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
