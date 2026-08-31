import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { ProductModel } from '../../src/modules/catalog/product.model.js';
import { OrderModel } from '../../src/modules/orders/order.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';

let customerSeq = 0;

async function createCustomerToken(): Promise<string> {
  customerSeq++;
  const user = await UserModel.create({
    name: 'Order Owner',
    mobile: `+9198761${String(customerSeq).padStart(5, '0')}`,
    email: 'owner@example.com',
    address: 'addr',
    cityState: 'city',
    role: 'CUSTOMER',
    mobileVerified: true,
  });
  const { accessToken } = await container.tokenService.issueTokenPair(user._id.toString(), 'CUSTOMER');
  return accessToken;
}

async function createAdminToken(): Promise<string> {
  const { accessToken } = await container.tokenService.issueTokenPair('fake-admin-id', 'ADMIN');
  return accessToken;
}

async function seedProduct(
  id: string,
  overrides: Partial<{ price: number; inventoryQuantity: number }> = {},
): Promise<void> {
  await ProductModel.create({
    _id: id,
    name: `Product ${id}`,
    images: ['https://example.com/img.jpg'],
    price: overrides.price ?? 1000,
    description: 'desc',
    specs: [],
    categoryId: 'panels',
    inventoryQuantity: overrides.inventoryQuantity ?? 10,
    lowStockThreshold: 5,
    isActive: true,
  });
}

interface OrderResponse {
  id: string;
  status: string;
}

async function placeOrder(customerToken: string, productId: string, quantity = 1): Promise<OrderResponse> {
  const res = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ lines: [{ productId, quantity }] });
  return res.body.data as OrderResponse;
}

describe('admin orders', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
    await ProductModel.deleteMany({});
    await OrderModel.deleteMany({});
  });

  it('rejects a CUSTOMER token on admin order routes', async () => {
    const customerToken = await createCustomerToken();
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('lists orders across all customers, with status/search filters', async () => {
    const adminToken = await createAdminToken();
    const customerToken = await createCustomerToken();
    await seedProduct('prod-x', { inventoryQuantity: 20 });

    const order1 = await placeOrder(customerToken, 'prod-x', 1);
    await placeOrder(customerToken, 'prod-x', 2);

    const listRes = await request(app).get('/api/v1/admin/orders').set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.meta.total).toBe(2);

    const searchRes = await request(app)
      .get(`/api/v1/admin/orders?search=${order1.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searchRes.body.data).toHaveLength(1);
    expect(searchRes.body.data[0].id).toBe(order1.id);

    const statusRes = await request(app)
      .get('/api/v1/admin/orders?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statusRes.body.meta.total).toBe(2);
  });

  it('returns full order detail including statusHistory and userId', async () => {
    const adminToken = await createAdminToken();
    const customerToken = await createCustomerToken();
    await seedProduct('prod-y', { inventoryQuantity: 10 });
    const order = await placeOrder(customerToken, 'prod-y', 1);

    const res = await request(app)
      .get(`/api/v1/admin/orders/${order.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.userId).toEqual(expect.any(String));
    expect(res.body.data.statusHistory).toEqual([
      expect.objectContaining({ status: 'PENDING', byRole: 'CUSTOMER' }),
    ]);
  });

  it('advances order status through the state machine and rejects illegal jumps', async () => {
    const adminToken = await createAdminToken();
    const customerToken = await createCustomerToken();
    await seedProduct('prod-z', { inventoryQuantity: 10 });
    const order = await placeOrder(customerToken, 'prod-z', 1);

    const illegal = await request(app)
      .patch(`/api/v1/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DELIVERED' });
    expect(illegal.status).toBe(409);
    expect(illegal.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    const confirm = await request(app)
      .patch(`/api/v1/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED', note: 'Verified payment offline' });
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe('CONFIRMED');
    expect(confirm.body.data.statusHistory).toHaveLength(2);
    expect(confirm.body.data.statusHistory[1]).toEqual(
      expect.objectContaining({ status: 'CONFIRMED', byRole: 'ADMIN', note: 'Verified payment offline' }),
    );
  });

  it('restocks inventory when admin cancels an order', async () => {
    const adminToken = await createAdminToken();
    const customerToken = await createCustomerToken();
    await seedProduct('prod-cancel', { inventoryQuantity: 10 });
    const order = await placeOrder(customerToken, 'prod-cancel', 4);

    expect((await ProductModel.findById('prod-cancel'))!.inventoryQuantity).toBe(6);

    const cancelRes = await request(app)
      .patch(`/api/v1/admin/orders/${order.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect((await ProductModel.findById('prod-cancel'))!.inventoryQuantity).toBe(10);
  });

  it('updates payment status independently of order status', async () => {
    const adminToken = await createAdminToken();
    const customerToken = await createCustomerToken();
    await seedProduct('prod-pay', { inventoryQuantity: 10 });
    const order = await placeOrder(customerToken, 'prod-pay', 1);

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${order.id}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentStatus: 'PAID' });
    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe('PAID');
    expect(res.body.data.status).toBe('PENDING');
  });

  it('returns 404 for an unknown order id', async () => {
    const adminToken = await createAdminToken();
    const res = await request(app)
      .get('/api/v1/admin/orders/SSAP-20260101-XXXX')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });
});
