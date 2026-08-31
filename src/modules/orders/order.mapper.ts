import { fromE164India } from '../../core/validation/mobile.js';
import type { OrderCustomerEntity, OrderEntity, OrderLineEntity } from './order.repository.js';
import type { OrderStatus, PaymentStatus } from '../../core/enums.js';

export interface PublicOrder {
  id: string;
  lines: OrderLineEntity[];
  subtotal: number;
  total: number;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customer: OrderCustomerEntity;
}

// userId, statusHistory, updatedAt, cancelledAt are explicitly backend-only per PRD §6.4 —
// GET /admin/orders/:id (Phase 6) returns statusHistory too, customer orders never do.
export function toPublicOrder(order: OrderEntity): PublicOrder {
  return {
    id: order.id,
    lines: order.lines,
    subtotal: order.subtotal,
    total: order.total,
    placedAt: order.placedAt.toISOString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    customer: { ...order.customer, mobile: fromE164India(order.customer.mobile) },
  };
}
