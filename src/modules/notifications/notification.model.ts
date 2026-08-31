import { Schema } from 'mongoose';
import { getOrCreateModel } from '../../core/db/model-factory.js';

// A shared admin feed (all admins see the same events), not per-user — there's no per-admin
// notification targeting concept in this system yet.
export interface NotificationSchemaType {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date | null;
}

const notificationSchema = new Schema<NotificationSchemaType>({
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  createdAt: { type: Date, required: true, default: () => new Date() },
  readAt: { type: Date, default: null },
});

notificationSchema.index({ createdAt: -1 });

export const NotificationModel = getOrCreateModel<NotificationSchemaType>('Notification', notificationSchema);
