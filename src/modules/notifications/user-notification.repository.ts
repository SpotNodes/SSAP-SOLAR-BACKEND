import { UserNotificationModel } from './user-notification.model.js';

export interface UserNotificationEntity {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date | null;
}

export interface CreateUserNotificationData {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface UserNotificationRepository {
  create(data: CreateUserNotificationData): Promise<void>;
  findByUser(
    userId: string,
    pagination: { skip: number; limit: number },
  ): Promise<{ items: UserNotificationEntity[]; total: number }>;
  countUnread(userId: string): Promise<number>;
  /** Returns false when the id isn't this user's — callers map that to a 404. */
  markRead(id: string, userId: string): Promise<boolean>;
  markAllRead(userId: string): Promise<number>;
}

export class MongoUserNotificationRepository implements UserNotificationRepository {
  async create(data: CreateUserNotificationData): Promise<void> {
    await UserNotificationModel.create(data);
  }

  async findByUser(
    userId: string,
    pagination: { skip: number; limit: number },
  ): Promise<{ items: UserNotificationEntity[]; total: number }> {
    const [docs, total] = await Promise.all([
      UserNotificationModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      UserNotificationModel.countDocuments({ userId }),
    ]);

    return {
      items: docs.map((doc) => ({
        id: doc._id.toString(),
        type: doc.type,
        title: doc.title,
        body: doc.body,
        data: doc.data,
        createdAt: doc.createdAt,
        readAt: doc.readAt,
      })),
      total,
    };
  }

  async countUnread(userId: string): Promise<number> {
    return UserNotificationModel.countDocuments({ userId, readAt: null });
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    // Scoped by userId, so one customer can never mark another's row read.
    const result = await UserNotificationModel.updateOne(
      { _id: id, userId, readAt: null },
      { readAt: new Date() },
    );
    // matchedCount, not modifiedCount: re-reading an already-read notification
    // is a no-op the client should still treat as success.
    return result.matchedCount > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await UserNotificationModel.updateMany(
      { userId, readAt: null },
      { readAt: new Date() },
    );
    return result.modifiedCount;
  }
}
