import type { UserNotificationEntity } from './user-notification.repository.js';

export interface PublicUserNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  /** Deep-link payload, e.g. `{ orderId }`. Absent when the event has no target. */
  data?: Record<string, unknown>;
  createdAt: string;
  /** ISO timestamp, or null while unread. The app badges on `readAt === null`. */
  readAt: string | null;
}

export function toPublicUserNotification(entity: UserNotificationEntity): PublicUserNotification {
  return {
    id: entity.id,
    type: entity.type,
    title: entity.title,
    body: entity.body,
    ...(entity.data ? { data: entity.data } : {}),
    createdAt: entity.createdAt.toISOString(),
    readAt: entity.readAt ? entity.readAt.toISOString() : null,
  };
}
