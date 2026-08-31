import type { NotificationEntity, NotificationRepository } from '../notifications/notification.repository.js';

export class AdminNotificationService {
  constructor(private readonly notifications: NotificationRepository) {}

  async listRecent(
    pagination: { skip: number; limit: number },
  ): Promise<{ items: NotificationEntity[]; total: number }> {
    return this.notifications.findRecent(pagination);
  }
}
