import type { NotificationEntity } from '../notifications/notification.repository.js';

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

export function toAdminNotification(notification: NotificationEntity): AdminNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    ...(notification.data ? { data: notification.data } : {}),
    createdAt: notification.createdAt.toISOString(),
    ...(notification.readAt ? { readAt: notification.readAt.toISOString() } : {}),
  };
}
