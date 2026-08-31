import type { OrderEntity } from './order.repository.js';

// PRD §10 Reliability: push/SMS sends are async and must never block the request path. OrderService
// and AdminOrderService call these fire-and-forget after their transactions commit. Phase 4
// replaces the no-op below with a real dispatcher (customer push + admin feed/email) — neither
// service's own logic will need to change.
export interface OrderEventPublisher {
  orderPlaced(order: OrderEntity): void;
  orderCancelled(order: OrderEntity): void;
  orderStatusChanged(order: OrderEntity): void;
  orderPaymentChanged(order: OrderEntity): void;
}

export class NoopOrderEventPublisher implements OrderEventPublisher {
  orderPlaced(_order: OrderEntity): void {
    // Phase 4: notify customer ("Order placed") + notify admin (new order).
  }

  orderCancelled(_order: OrderEntity): void {
    // Phase 4: notify customer + notify admin.
  }

  orderStatusChanged(_order: OrderEntity): void {
    // Phase 4: notify customer of the status change (CONFIRMED/PROCESSING/SHIPPED/DELIVERED).
  }

  orderPaymentChanged(_order: OrderEntity): void {
    // Phase 4: notify customer of the payment-status change.
  }
}
