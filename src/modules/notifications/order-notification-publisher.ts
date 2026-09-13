import { env } from '../../config/env.js';
import { logger } from '../../core/logger/logger.js';
import type { EmailSender } from '../../providers/email/email-sender.js';
import type { PushSender } from '../../providers/push/push-sender.js';
import type { OrderEventPublisher } from '../orders/order-events.js';
import type { OrderEntity } from '../orders/order.repository.js';
import type { DeviceRepository } from './device.repository.js';
import { notificationCopy } from './notification-copy.js';
import type { NotificationRepository } from './notification.repository.js';
import type { UserNotificationRepository } from './user-notification.repository.js';

// The OrderEventPublisher interface is void-returning by design (PRD §10: never block the
// request path) — each handler kicks off async work without the caller awaiting it, and errors
// are caught and logged here rather than surfacing as unhandled rejections.
export class NotificationOrderEventPublisher implements OrderEventPublisher {
  constructor(
    private readonly devices: DeviceRepository,
    private readonly pushSender: PushSender,
    private readonly notifications: NotificationRepository,
    private readonly emailSender: EmailSender,
    private readonly userNotifications: UserNotificationRepository,
  ) {}

  orderPlaced(order: OrderEntity): void {
    this.run('orderPlaced', async () => {
      await this.notifyCustomer(order.userId, 'ORDER_PLACED', {
        title: notificationCopy.orderPlacedTitle,
        body: notificationCopy.orderPlacedBody(order.id),
        data: { orderId: order.id },
      });
      await this.notifyAdmin(
        'ORDER_PLACED',
        `New order ${order.id}`,
        `${order.customer.name} placed an order totalling ₹${order.total}.`,
        { orderId: order.id },
      );
    });
  }

  orderCancelled(order: OrderEntity): void {
    this.run('orderCancelled', async () => {
      await this.notifyCustomer(order.userId, 'ORDER_CANCELLED', {
        title: notificationCopy.orderCancelledTitle,
        body: notificationCopy.orderCancelledBody(order.id),
        data: { orderId: order.id },
      });
      await this.notifyAdmin(
        'ORDER_CANCELLED',
        `Order ${order.id} cancelled`,
        `${order.customer.name}'s order ${order.id} was cancelled.`,
        { orderId: order.id },
      );
    });
  }

  orderStatusChanged(order: OrderEntity): void {
    this.run('orderStatusChanged', () =>
      this.notifyCustomer(order.userId, 'ORDER_STATUS_CHANGED', {
        title: notificationCopy.orderStatusChangedTitle,
        body: notificationCopy.orderStatusChangedBody(order.id, order.status),
        data: { orderId: order.id, status: order.status },
      }),
    );
  }

  orderPaymentChanged(order: OrderEntity): void {
    this.run('orderPaymentChanged', () =>
      this.notifyCustomer(order.userId, 'ORDER_PAYMENT_CHANGED', {
        title: notificationCopy.paymentStatusChangedTitle,
        body: notificationCopy.paymentStatusChangedBody(order.id, order.paymentStatus),
        data: { orderId: order.id, paymentStatus: order.paymentStatus },
      }),
    );
  }

  private run(label: string, task: () => Promise<void>): void {
    void task().catch((err: unknown) => {
      logger.error({ err, event: label }, 'Failed to dispatch order notification');
    });
  }

  /**
   * Persist the notification, THEN try to push it.
   *
   * Order matters. The row is the durable record the in-app notifications
   * screen reads; the push is a best-effort nudge that a closed app, a revoked
   * permission or an expired token can all swallow. Writing the row first means
   * a failed push never costs the user the notification — they still see it
   * next time they open the app.
   */
  private async notifyCustomer(
    userId: string,
    type: string,
    payload: { title: string; body: string; data?: Record<string, unknown> },
  ): Promise<void> {
    await this.userNotifications.create({ userId, type, ...payload });
    await this.pushToCustomer(userId, payload.title, payload.body);
  }

  private async pushToCustomer(userId: string, title: string, body: string): Promise<void> {
    const devices = await this.devices.findByUserId(userId);
    if (devices.length === 0) return;

    const tokens = devices.map((device) => device.expoPushToken);
    const result = await this.pushSender.send(tokens, { title, body });
    await Promise.all(result.invalidTokens.map((token) => this.devices.deleteByToken(token)));
  }

  // Only orderPlaced/orderCancelled call this (PRD §8.2) — status/payment changes are admin-
  // initiated, so notifying the admin who just made the change would be noise.
  private async notifyAdmin(
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await this.notifications.create({ type, title, body, data });

    const to = env.ADMIN_NOTIFICATION_EMAIL ?? env.ADMIN_BOOTSTRAP_EMAIL;
    if (!to) return;
    await this.emailSender.send({ to, subject: title, body });
  }
}
