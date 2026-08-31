import type { DevicePlatform } from './device.model.js';
import type { DeviceEntity, DeviceRepository } from './device.repository.js';

export class DeviceService {
  constructor(private readonly devices: DeviceRepository) {}

  async register(userId: string, expoPushToken: string, platform: DevicePlatform): Promise<DeviceEntity> {
    return this.devices.upsert({ userId, expoPushToken, platform });
  }

  async unregister(userId: string, expoPushToken: string): Promise<void> {
    await this.devices.deleteByTokenForUser(expoPushToken, userId);
  }
}
