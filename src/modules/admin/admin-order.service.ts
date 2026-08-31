import mongoose from 'mongoose';
import { Role } from '../../core/auth/roles.js';
import { OrderStatus, type PaymentStatus } from '../../core/enums.js';
import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type { ProductRepository } from '../catalog/product.repository.js';
import type { OrderEventPublisher } from '../orders/order-events.js';
import { assertTransitionAllowed } from '../orders/order-state-machine.js';
import type { AdminOrderSearchParams, OrderEntity, OrderRepository } from '../orders/order.repository.js';

export class AdminOrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly events: OrderEventPublisher,
  ) {}

  async search(params: AdminOrderSearchParams): Promise<{ items: OrderEntity[]; total: number }> {
    return this.orders.searchAdmin(params);
  }

  async getById(id: string): Promise<OrderEntity> {
    const order = await this.orders.findByIdAdmin(id);
    if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found.');
    return order;
  }

  async updateStatus(orderId: string, newStatus: OrderStatus, note?: string): Promise<OrderEntity> {
    const session = await mongoose.startSession();
    try {
      let result: OrderEntity | undefined;

      await session.withTransaction(async () => {
        const order = await this.orders.findByIdAdmin(orderId, session);
        if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found.');
        assertTransitionAllowed(order.status, newStatus);

        // The transition table only allows CANCELLED from PENDING/CONFIRMED/PROCESSING, so this
        // is exactly the set of orders that still hold reserved stock to give back.
        if (newStatus === OrderStatus.Cancelled) {
          await this.products.restock(
            order.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
            session,
          );
        }

        const now = new Date();
        const updated = await this.orders.updateStatus(
          orderId,
          {
            status: newStatus,
            historyEntry: { status: newStatus, at: now, byRole: Role.ADMIN, ...(note ? { note } : {}) },
            ...(newStatus === OrderStatus.Cancelled ? { cancelledAt: now } : {}),
          },
          session,
        );
        result = updated ?? undefined;
      });

      if (!result) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found.');

      if (result.status === OrderStatus.Cancelled) this.events.orderCancelled(result);
      else this.events.orderStatusChanged(result);

      return result;
    } finally {
      await session.endSession();
    }
  }

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<OrderEntity> {
    const updated = await this.orders.updatePaymentStatus(orderId, paymentStatus);
    if (!updated) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found.');
    this.events.orderPaymentChanged(updated);
    return updated;
  }
}
