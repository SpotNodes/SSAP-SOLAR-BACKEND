import mongoose from 'mongoose';
import { Role } from '../../core/auth/roles.js';
import { OrderStatus } from '../../core/enums.js';
import { AppError, type ErrorDetail } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type { ProductRepository } from '../catalog/product.repository.js';
import type { UserRepository } from '../users/user.repository.js';
import type { OrderEventPublisher } from './order-events.js';
import { assertCustomerCanCancel } from './order-state-machine.js';
import {
  IdempotencyConflictError,
  type OrderEntity,
  type OrderRepository,
} from './order.repository.js';
import type { CreateOrderBody } from './order.schema.js';

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly users: UserRepository,
    private readonly events: OrderEventPublisher,
  ) {}

  async placeOrder(
    userId: string,
    input: CreateOrderBody,
    idempotencyKeyHeader?: string,
  ): Promise<OrderEntity> {
    const idempotencyKey = idempotencyKeyHeader ?? input.idempotencyKey;

    if (idempotencyKey) {
      const existing = await this.orders.findByIdempotencyKey(userId, idempotencyKey);
      if (existing) return existing;
    }

    const user = await this.users.findById(userId);
    if (!user) throw new AppError(ErrorCode.UNAUTHENTICATED, 'Account no longer exists.');

    const session = await mongoose.startSession();
    try {
      let created: OrderEntity | undefined;

      try {
        await session.withTransaction(async () => {
          const productIds = input.lines.map((line) => line.productId);
          const products = await this.products.findManyByIds(productIds, session);
          const productMap = new Map(products.map((product) => [product.id, product]));

          const unavailable: ErrorDetail[] = input.lines
            .filter((line) => {
              const product = productMap.get(line.productId);
              return !product || !product.isActive;
            })
            .map((line) => ({ field: line.productId, message: 'Product is unavailable.' }));

          if (unavailable.length > 0) {
            throw new AppError(
              ErrorCode.PRODUCT_UNAVAILABLE,
              'One or more products are unavailable.',
              unavailable,
            );
          }

          const insufficient: ErrorDetail[] = input.lines
            .filter((line) => productMap.get(line.productId)!.inventoryQuantity < line.quantity)
            .map((line) => ({ field: line.productId, message: 'Insufficient stock.' }));

          if (insufficient.length > 0) {
            throw new AppError(
              ErrorCode.INSUFFICIENT_STOCK,
              'Insufficient stock for one or more products.',
              insufficient,
            );
          }

          const lines = input.lines.map((line) => {
            const product = productMap.get(line.productId)!;
            return {
              productId: product.id,
              name: product.name,
              price: product.price,
              quantity: line.quantity,
            };
          });
          const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

          // Authoritative guard against a race that slipped past the pre-check above.
          const stockResult = await this.products.decrementStock(
            input.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
            session,
          );
          if (!stockResult.ok) {
            throw new AppError(
              ErrorCode.INSUFFICIENT_STOCK,
              'Insufficient stock for one or more products.',
              [{ field: stockResult.failedProductId!, message: 'Insufficient stock.' }],
            );
          }

          created = await this.orders.create(
            {
              userId,
              lines,
              subtotal,
              total: subtotal,
              customer: {
                name: user.name,
                mobile: user.mobile,
                email: user.email,
                address: user.address,
                cityState: user.cityState,
              },
              idempotencyKey,
            },
            session,
          );
        });
      } catch (err) {
        if (err instanceof IdempotencyConflictError && idempotencyKey) {
          const winner = await this.orders.findByIdempotencyKey(userId, idempotencyKey);
          if (winner) return winner;
        }
        throw err;
      }

      this.events.orderPlaced(created!);
      return created!;
    } finally {
      await session.endSession();
    }
  }

  async listForUser(
    userId: string,
    pagination: { skip: number; limit: number },
  ): Promise<{ items: OrderEntity[]; total: number }> {
    return this.orders.findByUser(userId, pagination);
  }

  async getByIdForUser(orderId: string, userId: string): Promise<OrderEntity> {
    const order = await this.orders.findByIdForUser(orderId, userId);
    if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found.');
    return order;
  }

  async cancelOrder(orderId: string, userId: string): Promise<OrderEntity> {
    const session = await mongoose.startSession();
    try {
      let result: OrderEntity | undefined;

      await session.withTransaction(async () => {
        const order = await this.orders.findByIdForUser(orderId, userId, session);
        if (!order) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found.');
        assertCustomerCanCancel(order.status);

        await this.products.restock(
          order.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
          session,
        );

        const now = new Date();
        const updated = await this.orders.updateStatus(
          orderId,
          {
            status: OrderStatus.Cancelled,
            historyEntry: { status: OrderStatus.Cancelled, at: now, byRole: Role.CUSTOMER },
            cancelledAt: now,
          },
          session,
        );
        result = updated ?? undefined;
      });

      if (!result) throw new AppError(ErrorCode.ORDER_NOT_FOUND, 'Order not found.');
      this.events.orderCancelled(result);
      return result;
    } finally {
      await session.endSession();
    }
  }
}
