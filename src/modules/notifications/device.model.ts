import { Schema } from 'mongoose';
import { getOrCreateModel } from '../../core/db/model-factory.js';

export type DevicePlatform = 'ios' | 'android';

export interface DeviceSchemaType {
  userId: string;
  expoPushToken: string;
  platform: DevicePlatform;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<DeviceSchemaType>(
  {
    userId: { type: String, required: true },
    expoPushToken: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ios', 'android'], required: true },
  },
  { timestamps: true },
);

deviceSchema.index({ userId: 1 });

export const DeviceModel = getOrCreateModel<DeviceSchemaType>('Device', deviceSchema);
