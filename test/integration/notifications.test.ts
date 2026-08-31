import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { OrderStatus, PaymentStatus } from '../../src/core/enums.js';
import { Role } from '../../src/core/auth/roles.js';
import { DeviceModel } from '../../src/modules/notifications/device.model.js';
import { MongoDeviceRepository } from '../../src/modules/notifications/device.repository.js';
import { NotificationModel } from '../../src/modules/notifications/notification.model.js';
import { MongoNotificationRepository } from '../../src/modules/notifications/notification.repository.js';
import { NotificationOrderEventPublisher } from '../../src/modules/notifications/order-notification-publisher.js';
import type { OrderEntity } from '../../src/modules/orders/order.repository.js';
import { ProductModel } from '../../src/modules/catalog/product.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { devEmailOutbox } from '../../src/providers/email/dev-email-sender.js';
import { DevEmailSender } from '../../src/providers/email/dev-email-sender.js';
import { devPushOutbox } from '../../src/providers/push/dev-push-sender.js';
import { DevPushSender } from '../../src/providers/push/dev-push-sender.js';
import type { PushMessage, PushSendResult, PushSender } from '../../src/providers/push/push-sender.js';

// Fire-and-forget by design (PRD §10: never block the request path) — tests give the dispatch a
// short, generous window to complete. Everything it does (an in-memory-replset write, a logged
// dev-provider call) is local and fast; there is no real network in dev mode.
const DISPATCH_SETTLE_MS = 100;
const settle = () => new Promise((resolve) => setTimeout(resolve, DISPATCH_SETTLE_MS));

function fakeOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  return {
    id: 'SSAP-20260101-TEST',
    userId: 'user-1',
    lines: [{ productId: 'prod-1', name: 'Test Product', price: 1000, quantity: 1 }],
    subtotal: 1000,
    total: 1000,
    placedAt: new Date(),
    status: OrderStatus.Pending,
    paymentStatus: PaymentStatus.Unpaid,
    customer: {
      name: 'Test Customer',
      mobile: '+919876500000',
      email: 'test@example.com',
      address: 'addr',
      cityState: 'city',
    },
    statusHistory: [{ status: OrderStatus.Pending, at: new Date(), byRole: Role.CUSTOMER }],
    updatedAt: new Date(),
    cancelledAt: null,
    ...overrides,
  };
}

describe('order notification dispatch (direct)', () => {
  beforeEach(async () => {
    await DeviceModel.deleteMany({});
    await NotificationModel.deleteMany({});
    devPushOutbox.length = 0;
    devEmailOutbox.length = 0;
  });

  it('orderPlaced pushes to the customer\'s devices and notifies admin (feed + email)', async () => {
    await DeviceModel.create({ userId: 'user-1', expoPushToken: 'ExponentPushToken[a]', platform: 'ios' });

    const publisher = new NotificationOrderEventPublisher(
      new MongoDeviceRepository(),
      new DevPushSender(),
      new MongoNotificationRepository(),
      new DevEmailSender(),
    );

    publisher.orderPlaced(fakeOrder());
    await settle();

    expect(devPushOutbox).toHaveLength(1);
    expect(devPushOutbox[0]).toEqual(
      expect.objectContaining({
        tokens: ['ExponentPushToken[a]'],
        message: expect.objectContaining({ title: 'Order placed', body: expect.stringContaining('SSAP-20260101-TEST') }),
      }),
    );

    const notifications = await NotificationModel.find({});
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.type).toBe('ORDER_PLACED');

    expect(devEmailOutbox).toHaveLength(1);
    expect(devEmailOutbox[0]!.subject).toContain('SSAP-20260101-TEST');
  });

  it('orderCancelled notifies both customer and admin', async () => {
    await DeviceModel.create({ userId: 'user-1', expoPushToken: 'ExponentPushToken[a]', platform: 'ios' });
    const publisher = new NotificationOrderEventPublisher(
      new MongoDeviceRepository(),
      new DevPushSender(),
      new MongoNotificationRepository(),
      new DevEmailSender(),
    );

    publisher.orderCancelled(fakeOrder({ status: OrderStatus.Cancelled }));
    await settle();

    expect(devPushOutbox[0]!.message.title).toBe('Order cancelled');
    const notifications = await NotificationModel.find({});
    expect(notifications[0]!.type).toBe('ORDER_CANCELLED');
    expect(devEmailOutbox).toHaveLength(1);
  });

  it('orderStatusChanged and orderPaymentChanged push the customer only — no admin notification', async () => {
    await DeviceModel.create({ userId: 'user-1', expoPushToken: 'ExponentPushToken[a]', platform: 'ios' });
    const publisher = new NotificationOrderEventPublisher(
      new MongoDeviceRepository(),
      new DevPushSender(),
      new MongoNotificationRepository(),
      new DevEmailSender(),
    );

    publisher.orderStatusChanged(fakeOrder({ status: OrderStatus.Confirmed }));
    await settle();
    publisher.orderPaymentChanged(fakeOrder({ paymentStatus: PaymentStatus.Paid }));
    await settle();

    expect(devPushOutbox).toHaveLength(2);
    expect(devPushOutbox[0]!.message.title).toBe('Order update');
    expect(devPushOutbox[1]!.message.title).toBe('Payment update');
    expect(await NotificationModel.countDocuments({})).toBe(0);
    expect(devEmailOutbox).toHaveLength(0);
  });

  it('skips pushing gracefully when the customer has no registered devices', async () => {
    const publisher = new NotificationOrderEventPublisher(
      new MongoDeviceRepository(),
      new DevPushSender(),
      new MongoNotificationRepository(),
      new DevEmailSender(),
    );

    publisher.orderPlaced(fakeOrder());
    await settle();

    expect(devPushOutbox).toHaveLength(0);
    // Admin still gets notified even with no customer devices.
    expect(await NotificationModel.countDocuments({})).toBe(1);
  });

  it('prunes a device Expo reports as permanently invalid', async () => {
    await DeviceModel.create({ userId: 'user-1', expoPushToken: 'ExponentPushToken[dead]', platform: 'ios' });

    const failingPushSender: PushSender = {
      async send(_tokens: string[], _message: PushMessage): Promise<PushSendResult> {
        return { invalidTokens: ['ExponentPushToken[dead]'] };
      },
    };

    const publisher = new NotificationOrderEventPublisher(
      new MongoDeviceRepository(),
      failingPushSender,
      new MongoNotificationRepository(),
      new DevEmailSender(),
    );

    publisher.orderStatusChanged(fakeOrder({ status: OrderStatus.Shipped }));
    await settle();

    expect(await DeviceModel.countDocuments({ expoPushToken: 'ExponentPushToken[dead]' })).toBe(0);
  });
});

describe('order notification dispatch (end-to-end via HTTP)', () => {
  let customerSeq = 0;

  async function createCustomer(): Promise<{ userId: string; accessToken: string }> {
    customerSeq++;
    const user = await UserModel.create({
      name: 'Notify Customer',
      mobile: `+9198763${String(customerSeq).padStart(5, '0')}`,
      email: 'notify@example.com',
      address: 'addr',
      cityState: 'city',
      role: 'CUSTOMER',
      mobileVerified: true,
    });
    const { accessToken } = await container.tokenService.issueTokenPair(user._id.toString(), 'CUSTOMER');
    return { userId: user._id.toString(), accessToken };
  }

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await ProductModel.deleteMany({});
    await DeviceModel.deleteMany({});
    await NotificationModel.deleteMany({});
    devPushOutbox.length = 0;
    devEmailOutbox.length = 0;
  });

  it('placing an order pushes the customer and shows up in the admin feed', async () => {
    const { accessToken } = await createCustomer();
    await request(app)
      .post('/api/v1/devices')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ expoPushToken: 'ExponentPushToken[e2e]', platform: 'android' });

    await ProductModel.create({
      _id: 'prod-notify',
      name: 'Notify Product',
      images: ['https://example.com/img.jpg'],
      price: 500,
      description: 'd',
      specs: [],
      categoryId: 'panels',
      inventoryQuantity: 10,
      lowStockThreshold: 5,
      isActive: true,
    });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lines: [{ productId: 'prod-notify', quantity: 1 }] });
    expect(orderRes.status).toBe(201);

    await settle();

    expect(devPushOutbox.some((entry) => entry.tokens.includes('ExponentPushToken[e2e]'))).toBe(true);

    const { accessToken: adminToken } = await container.tokenService.issueTokenPair('fake-admin', 'ADMIN');
    const feedRes = await request(app)
      .get('/api/v1/admin/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(feedRes.status).toBe(200);
    expect(feedRes.body.data.some((n: { type: string }) => n.type === 'ORDER_PLACED')).toBe(true);
  });

  it('rejects a CUSTOMER token on the admin notifications feed', async () => {
    const { accessToken } = await createCustomer();
    const res = await request(app)
      .get('/api/v1/admin/notifications')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});
