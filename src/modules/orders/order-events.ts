import type { OrderEntity } from './order.repository.js';

// PRD §10 Reliability: push/SMS sends are async and must never block the request path. OrderService
// calls these fire-and-forget after its transaction commits. Phase 4 replaces the no-op below with
// a real dispatcher (customer push + admin feed/email) — OrderService itself won't change.
export interface OrderEventPublisher {
  orderPlaced(order: OrderEntity): void;
  orderCancelled(order: OrderEntity): void;
}

export class NoopOrderEventPublisher implements OrderEventPublisher {
  orderPlaced(_order: OrderEntity): void {
    // Phase 4: notify customer ("Order placed") + notify admin (new order).
  }

  orderCancelled(_order: OrderEntity): void {
    // Phase 4: notify customer + notify admin.
  }
}
