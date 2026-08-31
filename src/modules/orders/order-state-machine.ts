import { OrderStatus } from '../../core/enums.js';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Confirmed, OrderStatus.Cancelled],
  [OrderStatus.Confirmed]: [OrderStatus.Processing, OrderStatus.Cancelled],
  [OrderStatus.Processing]: [OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
};

// Customer may only ever move an order to CANCELLED, and only from these. Admin (Phase 6) drives
// forward transitions via assertTransitionAllowed below, reusing the same table.
export const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.Pending,
  OrderStatus.Confirmed,
  OrderStatus.Processing,
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertCustomerCanCancel(status: OrderStatus): void {
  if (!CANCELLABLE_STATUSES.includes(status)) {
    throw new AppError(ErrorCode.ORDER_NOT_CANCELLABLE, 'This order can no longer be cancelled.');
  }
}

export function assertTransitionAllowed(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new AppError(
      ErrorCode.INVALID_STATUS_TRANSITION,
      `Cannot move an order from ${from} to ${to}.`,
    );
  }
}
