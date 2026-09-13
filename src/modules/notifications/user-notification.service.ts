import { AppError } from '../../core/errors/app-error.js';
import { ErrorCode } from '../../core/errors/error-codes.js';
import type {
  UserNotificationEntity,
  UserNotificationRepository,
} from './user-notification.repository.js';

export class UserNotificationService {
  constructor(private readonly notifications: UserNotificationRepository) {}

  async listForUser(
    userId: string,
    pagination: { skip: number; limit: number },
  ): Promise<{ items: UserNotificationEntity[]; total: number }> {
    return this.notifications.findByUser(userId, pagination);
  }

  async countUnread(userId: string): Promise<number> {
    return this.notifications.countUnread(userId);
  }

  async markRead(id: string, userId: string): Promise<void> {
    const ok = await this.notifications.markRead(id, userId);
    // A row belonging to someone else is indistinguishable from a missing one,
    // by design — otherwise this endpoint would confirm that an id exists.
    if (!ok) throw new AppError(ErrorCode.NOTIFICATION_NOT_FOUND, 'Notification not found.');
  }

  async markAllRead(userId: string): Promise<number> {
    return this.notifications.markAllRead(userId);
  }
}
