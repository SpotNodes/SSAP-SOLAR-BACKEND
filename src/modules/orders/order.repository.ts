import type { ClientSession, HydratedDocument } from 'mongoose';
import type { Role } from '../../core/auth/roles.js';
import { Role as RoleValue } from '../../core/auth/roles.js';
import { isDuplicateKeyError } from '../../core/db/mongo-errors.js';
import { OrderStatus, PaymentStatus } from '../../core/enums.js';
import { generateOrderId } from './order-id.js';
import { OrderModel, type OrderLineSchemaType, type OrderSchemaType } from './order.model.js';

export interface OrderLineEntity {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderCustomerEntity {
  name: string;
  mobile: string;
  email: string;
  address: string;
  cityState: string;
}

export interface OrderStatusHistoryEntryEntity {
  status: OrderStatus;
  at: Date;
  byRole: Role;
  note?: string;
}

export interface OrderEntity {
  id: string;
  userId: string;
  lines: OrderLineEntity[];
  subtotal: number;
  total: number;
  placedAt: Date;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customer: OrderCustomerEntity;
  statusHistory: OrderStatusHistoryEntryEntity[];
  updatedAt: Date;
  cancelledAt?: Date | null;
}

export interface CreateOrderData {
  userId: string;
  lines: OrderLineSchemaType[];
  subtotal: number;
  total: number;
  customer: OrderCustomerEntity;
  idempotencyKey?: string;
}

export interface UpdateStatusData {
  status: OrderStatus;
  historyEntry: OrderStatusHistoryEntryEntity;
  cancelledAt?: Date;
}

// Thrown internally when a concurrent request already claimed the same (userId, idempotencyKey)
// pair — the caller should fetch and return that request's order instead of treating this as a
// real failure. Never escapes the module.
export class IdempotencyConflictError extends Error {}

function getDuplicateKeyFields(err: unknown): string[] {
  if (typeof err === 'object' && err !== null && 'keyValue' in err) {
    return Object.keys((err as { keyValue: Record<string, unknown> }).keyValue);
  }
  return [];
}

function toEntity(doc: HydratedDocument<OrderSchemaType>): OrderEntity {
  return {
    id: doc._id,
    userId: doc.userId,
    lines: doc.lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      price: line.price,
      quantity: line.quantity,
    })),
    subtotal: doc.subtotal,
    total: doc.total,
    placedAt: doc.placedAt,
    status: doc.status,
    paymentStatus: doc.paymentStatus,
    customer: {
      name: doc.customer.name,
      mobile: doc.customer.mobile,
      email: doc.customer.email,
      address: doc.customer.address,
      cityState: doc.customer.cityState,
    },
    statusHistory: doc.statusHistory.map((entry) => ({
      status: entry.status,
      at: entry.at,
      byRole: entry.byRole,
      ...(entry.note ? { note: entry.note } : {}),
    })),
    updatedAt: doc.updatedAt,
    cancelledAt: doc.cancelledAt,
  };
}

export interface OrderRepository {
  create(data: CreateOrderData, session: ClientSession): Promise<OrderEntity>;
  findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<OrderEntity | null>;
  findByUser(
    userId: string,
    pagination: { skip: number; limit: number },
  ): Promise<{ items: OrderEntity[]; total: number }>;
  findByIdForUser(id: string, userId: string, session?: ClientSession): Promise<OrderEntity | null>;
  updateStatus(
    id: string,
    update: UpdateStatusData,
    session?: ClientSession,
  ): Promise<OrderEntity | null>;
}

export class MongoOrderRepository implements OrderRepository {
  async create(data: CreateOrderData, session: ClientSession): Promise<OrderEntity> {
    const now = new Date();
    const historyEntry = { status: OrderStatus.Pending, at: now, byRole: RoleValue.CUSTOMER };

    let attempts = 0;
    for (;;) {
      const id = generateOrderId(now);
      try {
        const [doc] = await OrderModel.create(
          [
            {
              _id: id,
              userId: data.userId,
              lines: data.lines,
              subtotal: data.subtotal,
              total: data.total,
              placedAt: now,
              status: OrderStatus.Pending,
              paymentStatus: PaymentStatus.Unpaid,
              customer: data.customer,
              statusHistory: [historyEntry],
              idempotencyKey: data.idempotencyKey,
            },
          ],
          { session },
        );
        return toEntity(doc!);
      } catch (err) {
        if (isDuplicateKeyError(err)) {
          const fields = getDuplicateKeyFields(err);
          if (fields.includes('_id') && attempts < 5) {
            attempts++;
            continue;
          }
          if (fields.includes('idempotencyKey')) {
            throw new IdempotencyConflictError();
          }
        }
        throw err;
      }
    }
  }

  async findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<OrderEntity | null> {
    const doc = await OrderModel.findOne({ userId, idempotencyKey });
    return doc ? toEntity(doc) : null;
  }

  async findByUser(
    userId: string,
    pagination: { skip: number; limit: number },
  ): Promise<{ items: OrderEntity[]; total: number }> {
    const filter = { userId };
    const [docs, total] = await Promise.all([
      OrderModel.find(filter).sort({ placedAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      OrderModel.countDocuments(filter),
    ]);
    return { items: docs.map(toEntity), total };
  }

  async findByIdForUser(id: string, userId: string, session?: ClientSession): Promise<OrderEntity | null> {
    const doc = await OrderModel.findOne({ _id: id, userId }).session(session ?? null);
    return doc ? toEntity(doc) : null;
  }

  async updateStatus(
    id: string,
    update: UpdateStatusData,
    session?: ClientSession,
  ): Promise<OrderEntity | null> {
    const doc = await OrderModel.findOneAndUpdate(
      { _id: id },
      {
        status: update.status,
        $push: { statusHistory: update.historyEntry },
        ...(update.cancelledAt ? { cancelledAt: update.cancelledAt } : {}),
      },
      { new: true, session },
    );
    return doc ? toEntity(doc) : null;
  }
}
