import { Schema } from 'mongoose';
import { Role } from '../../core/auth/roles.js';
import { getOrCreateModel } from '../../core/db/model-factory.js';
import { OrderStatus, PaymentStatus } from '../../core/enums.js';

export interface OrderLineSchemaType {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderCustomerSchemaType {
  name: string;
  mobile: string;
  email: string;
  address: string;
  cityState: string;
}

export interface OrderStatusHistoryEntrySchemaType {
  status: OrderStatus;
  at: Date;
  byRole: Role;
  note?: string;
}

export interface OrderSchemaType {
  _id: string;
  userId: string;
  lines: OrderLineSchemaType[];
  subtotal: number;
  total: number;
  placedAt: Date;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  customer: OrderCustomerSchemaType;
  statusHistory: OrderStatusHistoryEntrySchemaType[];
  idempotencyKey?: string;
  updatedAt: Date;
  cancelledAt?: Date | null;
}

const orderLineSchema = new Schema<OrderLineSchemaType>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const orderCustomerSchema = new Schema<OrderCustomerSchemaType>(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    cityState: { type: String, required: true },
  },
  { _id: false },
);

const orderStatusHistoryEntrySchema = new Schema<OrderStatusHistoryEntrySchemaType>(
  {
    status: { type: String, enum: Object.values(OrderStatus), required: true },
    at: { type: Date, required: true },
    byRole: { type: String, enum: Object.values(Role), required: true },
    note: { type: String },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderSchemaType>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true },
    lines: { type: [orderLineSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    placedAt: { type: Date, required: true },
    status: { type: String, enum: Object.values(OrderStatus), required: true },
    paymentStatus: { type: String, enum: Object.values(PaymentStatus), required: true },
    customer: { type: orderCustomerSchema, required: true },
    statusHistory: { type: [orderStatusHistoryEntrySchema], required: true, default: [] },
    idempotencyKey: { type: String },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

orderSchema.index({ userId: 1, placedAt: -1 });
// Only enforced among documents that actually carry a key — most requests omit Idempotency-Key,
// and a bare `sparse` index would still collide every such document on a shared `null` value.
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } },
);

export const OrderModel = getOrCreateModel<OrderSchemaType>('Order', orderSchema);
