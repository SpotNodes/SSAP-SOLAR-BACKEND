import { Schema } from 'mongoose';
import { getOrCreateModel } from '../../core/db/model-factory.js';

/**
 * A customer's own notification inbox — deliberately a different collection
 * from `Notification`, which is the SHARED admin feed with no per-user
 * targeting. Mixing the two would leak every customer's events into the admin
 * list and vice versa.
 *
 * These rows are what makes a notification survivable: a push is fire-and-
 * forget (the device may be offline, the OS may drop it, the user may have
 * notifications disabled), so the row is the durable record the app reads.
 */
export interface UserNotificationSchemaType {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date | null;
}

const userNotificationSchema = new Schema<UserNotificationSchemaType>({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  createdAt: { type: Date, required: true, default: () => new Date() },
  readAt: { type: Date, default: null },
});

// Covers both the inbox listing and the unread-count badge.
userNotificationSchema.index({ userId: 1, createdAt: -1 });

export const UserNotificationModel = getOrCreateModel<UserNotificationSchemaType>(
  'UserNotification',
  userNotificationSchema,
);
