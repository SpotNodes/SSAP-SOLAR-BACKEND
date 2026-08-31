import { NotificationModel } from './notification.model.js';

export interface NotificationEntity {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date | null;
}

export interface CreateNotificationData {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationRepository {
  create(data: CreateNotificationData): Promise<void>;
  findRecent(pagination: { skip: number; limit: number }): Promise<{ items: NotificationEntity[]; total: number }>;
}

export class MongoNotificationRepository implements NotificationRepository {
  async create(data: CreateNotificationData): Promise<void> {
    await NotificationModel.create(data);
  }

  async findRecent(
    pagination: { skip: number; limit: number },
  ): Promise<{ items: NotificationEntity[]; total: number }> {
    const [docs, total] = await Promise.all([
      NotificationModel.find({}).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
      NotificationModel.countDocuments({}),
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
}
