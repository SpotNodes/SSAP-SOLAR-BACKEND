// Order-placed/cancelled copy mirrors the app's src/constants/strings.ts verbatim
// (strings.notifications) so a server push reads identically to the app's own local notification
// it replaces. statusChanged/paymentChanged are new — the app has no local equivalent for these.
export const notificationCopy = {
  orderPlacedTitle: 'Order placed',
  orderPlacedBody: (orderId: string): string => `Your order ${orderId} has been placed successfully.`,
  orderCancelledTitle: 'Order cancelled',
  orderCancelledBody: (orderId: string): string => `Order ${orderId} has been cancelled.`,
  orderStatusChangedTitle: 'Order update',
  orderStatusChangedBody: (orderId: string, status: string): string =>
    `Your order ${orderId} is now ${status}.`,
  paymentStatusChangedTitle: 'Payment update',
  paymentStatusChangedBody: (orderId: string, paymentStatus: string): string =>
    `Payment for order ${orderId} is now ${paymentStatus}.`,
};
