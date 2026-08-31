// Exact wire values from the app's src/constants/enums.ts — do not rename.

export const OrderStatus = {
  Pending: 'PENDING',
  Confirmed: 'CONFIRMED',
  Processing: 'PROCESSING',
  Shipped: 'SHIPPED',
  Delivered: 'DELIVERED',
  Cancelled: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  Unpaid: 'UNPAID',
  Paid: 'PAID',
  Refunded: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const StockStatus = {
  InStock: 'IN_STOCK',
  LowStock: 'LOW_STOCK',
  OutOfStock: 'OUT_OF_STOCK',
} as const;
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];
