import { DeviceModel, type DevicePlatform } from './device.model.js';

export interface DeviceEntity {
  id: string;
  userId: string;
  expoPushToken: string;
  platform: DevicePlatform;
}

export interface DeviceRepository {
  upsert(data: { userId: string; expoPushToken: string; platform: DevicePlatform }): Promise<DeviceEntity>;
  deleteByTokenForUser(expoPushToken: string, userId: string): Promise<void>;
  deleteByToken(expoPushToken: string): Promise<void>;
  findByUserId(userId: string): Promise<DeviceEntity[]>;
}

function toEntity(doc: { _id: unknown; userId: string; expoPushToken: string; platform: DevicePlatform }): DeviceEntity {
  return {
    id: String(doc._id),
    userId: doc.userId,
    expoPushToken: doc.expoPushToken,
    platform: doc.platform,
  };
}

export class MongoDeviceRepository implements DeviceRepository {
  async upsert(data: { userId: string; expoPushToken: string; platform: DevicePlatform }): Promise<DeviceEntity> {
    const doc = await DeviceModel.findOneAndUpdate(
      { expoPushToken: data.expoPushToken },
      { userId: data.userId, platform: data.platform },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return toEntity(doc!);
  }

  async deleteByTokenForUser(expoPushToken: string, userId: string): Promise<void> {
    await DeviceModel.deleteOne({ expoPushToken, userId });
  }

  async deleteByToken(expoPushToken: string): Promise<void> {
    await DeviceModel.deleteOne({ expoPushToken });
  }

  async findByUserId(userId: string): Promise<DeviceEntity[]> {
    const docs = await DeviceModel.find({ userId });
    return docs.map(toEntity);
  }
}
