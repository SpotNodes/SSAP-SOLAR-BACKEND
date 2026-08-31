import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { DeviceModel } from '../../src/modules/notifications/device.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';

let seq = 0;

async function createCustomerToken(): Promise<string> {
  seq++;
  const user = await UserModel.create({
    name: 'Device Owner',
    mobile: `+9198762${String(seq).padStart(5, '0')}`,
    email: 'device@example.com',
    address: 'addr',
    cityState: 'city',
    role: 'CUSTOMER',
    mobileVerified: true,
  });
  const { accessToken } = await container.tokenService.issueTokenPair(user._id.toString(), 'CUSTOMER');
  return accessToken;
}

describe('devices', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
    await DeviceModel.deleteMany({});
  });

  it('rejects an unauthenticated registration', async () => {
    const res = await request(app)
      .post('/api/v1/devices')
      .send({ expoPushToken: 'ExponentPushToken[abc]', platform: 'ios' });
    expect(res.status).toBe(401);
  });

  it('registers a device and associates it with the caller', async () => {
    const token = await createCustomerToken();
    const res = await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${token}`)
      .send({ expoPushToken: 'ExponentPushToken[abc]', platform: 'ios' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(
      expect.objectContaining({ expoPushToken: 'ExponentPushToken[abc]', platform: 'ios' }),
    );
  });

  it('re-registering the same token from a different user reassigns ownership (upsert by token)', async () => {
    const tokenA = await createCustomerToken();
    const tokenB = await createCustomerToken();
    const expoPushToken = 'ExponentPushToken[shared]';

    await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ expoPushToken, platform: 'android' });

    await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ expoPushToken, platform: 'android' });

    const docs = await DeviceModel.find({ expoPushToken });
    expect(docs).toHaveLength(1);
  });

  it("deletes only the caller's own device registration", async () => {
    const tokenA = await createCustomerToken();
    const tokenB = await createCustomerToken();
    const expoPushToken = 'ExponentPushToken[owned-by-a]';

    await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ expoPushToken, platform: 'ios' });

    // B deleting A's token is a no-op (still 204, idempotent) — it does not remove A's device.
    const otherDelete = await request(app)
      .delete(`/api/v1/devices/${encodeURIComponent(expoPushToken)}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(otherDelete.status).toBe(204);
    expect(await DeviceModel.countDocuments({ expoPushToken })).toBe(1);

    const ownDelete = await request(app)
      .delete(`/api/v1/devices/${encodeURIComponent(expoPushToken)}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(ownDelete.status).toBe(204);
    expect(await DeviceModel.countDocuments({ expoPushToken })).toBe(0);
  });
});
