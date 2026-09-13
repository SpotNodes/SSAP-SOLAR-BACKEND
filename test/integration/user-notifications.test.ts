import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { UserNotificationModel } from '../../src/modules/notifications/user-notification.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { OrderModel } from '../../src/modules/orders/order.model.js';
import { ProductModel } from '../../src/modules/catalog/product.model.js';

let seq = 0;

async function createCustomer(): Promise<{ userId: string; accessToken: string }> {
  seq++;
  const user = await UserModel.create({
    name: 'Test Customer',
    mobile: `+9198760${String(seq).padStart(5, '0')}`,
    email: `customer${seq}@example.com`,
    address: '1 Test St',
    cityState: 'Pune, Maharashtra',
    role: 'CUSTOMER',
    mobileVerified: true,
  });
  const { accessToken } = await container.tokenService.issueTokenPair(
    user._id.toString(),
    'CUSTOMER',
  );
  return { userId: user._id.toString(), accessToken };
}

async function seedNotification(userId: string, title: string): Promise<string> {
  const doc = await UserNotificationModel.create({
    userId,
    type: 'ORDER_STATUS_CHANGED',
    title,
    body: 'body',
    data: { orderId: 'SSAP-1' },
  });
  return doc._id.toString();
}

describe('customer notification inbox', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
    await UserNotificationModel.deleteMany({});
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  it('returns only the caller’s own notifications', async () => {
    const me = await createCustomer();
    const other = await createCustomer();
    await seedNotification(me.userId, 'Mine');
    await seedNotification(other.userId, 'Theirs');

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${me.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Mine');
    expect(res.body.data[0].readAt).toBeNull();
  });

  it('counts unread, and stops counting once read', async () => {
    const me = await createCustomer();
    const id = await seedNotification(me.userId, 'One');
    await seedNotification(me.userId, 'Two');
    const auth = { Authorization: `Bearer ${me.accessToken}` };

    let res = await request(app).get('/api/v1/notifications/unread-count').set(auth);
    expect(res.body.data.unread).toBe(2);

    res = await request(app).post(`/api/v1/notifications/${id}/read`).set(auth);
    expect(res.status).toBe(200);

    res = await request(app).get('/api/v1/notifications/unread-count').set(auth);
    expect(res.body.data.unread).toBe(1);
  });

  it('marks every unread notification read at once', async () => {
    const me = await createCustomer();
    await seedNotification(me.userId, 'One');
    await seedNotification(me.userId, 'Two');
    const auth = { Authorization: `Bearer ${me.accessToken}` };

    const res = await request(app).post('/api/v1/notifications/read-all').set(auth);
    expect(res.body.data.updated).toBe(2);

    const after = await request(app).get('/api/v1/notifications/unread-count').set(auth);
    expect(after.body.data.unread).toBe(0);
  });

  it('cannot mark another user’s notification read', async () => {
    const me = await createCustomer();
    const other = await createCustomer();
    const theirId = await seedNotification(other.userId, 'Theirs');

    const res = await request(app)
      .post(`/api/v1/notifications/${theirId}/read`)
      .set('Authorization', `Bearer ${me.accessToken}`);

    expect(res.status).toBe(404);

    // And it really is still unread for its owner.
    const owner = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${other.accessToken}`);
    expect(owner.body.data.unread).toBe(1);
  });

  it('newest first', async () => {
    const me = await createCustomer();
    await seedNotification(me.userId, 'Older');
    await new Promise((r) => setTimeout(r, 10));
    await seedNotification(me.userId, 'Newer');

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${me.accessToken}`);
    expect(res.body.data.map((n: { title: string }) => n.title)).toEqual(['Newer', 'Older']);
  });
});

/**
 * The whole point of the feature: an admin acting on an order must reach the
 * customer who owns it. Exercised through the real HTTP endpoints, so the
 * publisher wiring is covered rather than mocked.
 */
describe('admin actions reach the customer inbox', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
    await UserNotificationModel.deleteMany({});
    await OrderModel.deleteMany({});
    await ProductModel.deleteMany({});
  });

  it('an admin status change lands in that customer’s notifications', async () => {
    const me = await createCustomer();
    const other = await createCustomer();
    const { accessToken: adminToken } = await container.tokenService.issueTokenPair(
      'admin-id',
      'ADMIN',
    );

    await ProductModel.create({
      _id: 'p1',
      name: 'Panel',
      images: ['https://example.com/i.jpg'],
      price: 1000,
      description: 'd',
      specs: [],
      categoryId: 'panels',
      inventoryQuantity: 10,
      lowStockThreshold: 5,
      isActive: true,
    });

    const placed = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${me.accessToken}`)
      .send({ lines: [{ productId: 'p1', quantity: 1 }] });
    expect(placed.status).toBe(201);
    const orderId = placed.body.data.id as string;

    await request(app)
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED' });

    // Events are dispatched off the request path, so give them a tick to land.
    await new Promise((r) => setTimeout(r, 300));

    const mine = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${me.accessToken}`);

    const types = mine.body.data.map((n: { type: string }) => n.type);
    expect(types).toContain('ORDER_STATUS_CHANGED');
    expect(types).toContain('ORDER_PLACED');

    // And nothing leaked to the unrelated customer.
    const theirs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${other.accessToken}`);
    expect(theirs.body.data).toHaveLength(0);
  });
});
