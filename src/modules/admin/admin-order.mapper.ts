import { fromE164India } from '../../core/validation/mobile.js';
import type { OrderEntity } from '../orders/order.repository.js';

// Unlike the customer-facing PublicOrder, admins see everything: userId and the full
// statusHistory audit trail (PRD §9.1 — "full order incl. statusHistory").
export interface AdminOrder {
  id: string;
  userId: string;
  lines: OrderEntity['lines'];
  subtotal: number;
  total: number;
  placedAt: string;
  status: OrderEntity['status'];
  paymentStatus: OrderEntity['paymentStatus'];
  customer: OrderEntity['customer'];
  statusHistory: (Omit<OrderEntity['statusHistory'][number], 'at'> & { at: string })[];
  updatedAt: string;
  cancelledAt?: string;
}

export function toAdminOrder(order: OrderEntity): AdminOrder {
  return {
    id: order.id,
    userId: order.userId,
    lines: order.lines,
    subtotal: order.subtotal,
    total: order.total,
    placedAt: order.placedAt.toISOString(),
    status: order.status,
    paymentStatus: order.paymentStatus,
    customer: { ...order.customer, mobile: fromE164India(order.customer.mobile) },
    statusHistory: order.statusHistory.map((entry) => ({ ...entry, at: entry.at.toISOString() })),
    updatedAt: order.updatedAt.toISOString(),
    ...(order.cancelledAt ? { cancelledAt: order.cancelledAt.toISOString() } : {}),
  };
}
