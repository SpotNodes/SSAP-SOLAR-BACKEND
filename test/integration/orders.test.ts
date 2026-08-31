import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { ProductModel } from '../../src/modules/catalog/product.model.js';
import { OrderModel } from '../../src/modules/orders/order.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';

let customerSeq = 0;

async function createCustomer(): Promise<{ userId: string; accessToken: string }> {
  customerSeq++;
  const user = await UserModel.create({
    name: 'Test Customer',
    mobile: `+9198765${String(customerSeq).padStart(5, '0')}`,
    email: 'customer@example.com',
    address: '1 Test St',
    cityState: 'Pune, Maharashtra',
    role: 'CUSTOMER',
    mobileVerified: true,
  });
  const { accessToken } = await container.tokenService.issueTokenPair(user._id.toString(), 'CUSTOMER');
  return { userId: user._id.toString(), accessToken };
}

async function seedProduct(
  id: string,
  overrides: Partial<{ price: number; inventoryQuantity: number; isActive: boolean }> = {},
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
    isActive: overrides.isActive ?? true,
  });
}

describe('orders', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
    await ProductModel.deleteMany({});
    await OrderModel.deleteMany({});
  });

  it('recomputes price/total server-side, ignoring client-supplied values', async () => {
    const { accessToken } = await createCustomer();
    await seedProduct('prod-a', { price: 500, inventoryQuantity: 10 });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        lines: [{ productId: 'prod-a', quantity: 2, price: 999999, name: 'HACKED' }],
        total: 1,
        customer: { name: 'fake', mobile: '0000000000' },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.lines).toEqual([
      { productId: 'prod-a', name: 'Product prod-a', price: 500, quantity: 2 },
    ]);
    expect(res.body.data.subtotal).toBe(1000);
    expect(res.body.data.total).toBe(1000);
    expect(res.body.data.customer.name).toBe('Test Customer');
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.paymentStatus).toBe('UNPAID');
    expect(res.body.data.id).toMatch(/^SSAP-\d{8}-[A-Z0-9]{4}$/);

    const product = await ProductModel.findById('prod-a');
    expect(product!.inventoryQuantity).toBe(8);
  });

  it('rejects insufficient stock per line and leaves inventory untouched', async () => {
    const { accessToken } = await createCustomer();
    await seedProduct('prod-b', { inventoryQuantity: 1 });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lines: [{ productId: 'prod-b', quantity: 5 }] });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.details).toEqual([{ field: 'prod-b', message: 'Insufficient stock.' }]);

    const product = await ProductModel.findById('prod-b');
    expect(product!.inventoryQuantity).toBe(1);
  });

  it('rejects unknown or inactive products', async () => {
    const { accessToken } = await createCustomer();
    await seedProduct('prod-inactive', { isActive: false });

    const unknownRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lines: [{ productId: 'does-not-exist', quantity: 1 }] });
    expect(unknownRes.status).toBe(409);
    expect(unknownRes.body.error.code).toBe('PRODUCT_UNAVAILABLE');

    const inactiveRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lines: [{ productId: 'prod-inactive', quantity: 1 }] });
    expect(inactiveRes.status).toBe(409);
    expect(inactiveRes.body.error.code).toBe('PRODUCT_UNAVAILABLE');
  });

  it('is idempotent via the Idempotency-Key header on a sequential retry', async () => {
    const { accessToken } = await createCustomer();
    await seedProduct('prod-idem', { inventoryQuantity: 10 });
    const key = 'test-idem-key-1';

    const first = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', key)
      .send({ lines: [{ productId: 'prod-idem', quantity: 3 }] });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', key)
      .send({ lines: [{ productId: 'prod-idem', quantity: 3 }] });
    expect(second.status).toBe(201);
    expect(second.body.data.id).toBe(first.body.data.id);

    expect(await OrderModel.countDocuments({})).toBe(1);
    const product = await ProductModel.findById('prod-idem');
    expect(product!.inventoryQuantity).toBe(7);
  });

  it('handles a genuinely concurrent double-POST with the same key without double-creating', async () => {
    const { accessToken } = await createCustomer();
    await seedProduct('prod-race', { inventoryQuantity: 10 });
    const key = 'race-key-1';

    const send = () =>
      request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', key)
        .send({ lines: [{ productId: 'prod-race', quantity: 2 }] });

    const [a, b] = await Promise.all([send(), send()]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(a.body.data.id).toBe(b.body.data.id);

    expect(await OrderModel.countDocuments({})).toBe(1);
    const product = await ProductModel.findById('prod-race');
    expect(product!.inventoryQuantity).toBe(8);
  });

  it("lists the customer's orders newest-first, paginated", async () => {
    const { accessToken } = await createCustomer();
    await seedProduct('prod-list', { inventoryQuantity: 100 });

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ lines: [{ productId: 'prod-list', quantity: 1 }] });
      expect(res.status).toBe(201);
    }

    const res = await request(app).get('/api/v1/orders').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta.total).toBe(3);
    const placedAts = res.body.data.map((o: { placedAt: string }) => new Date(o.placedAt).getTime());
    expect(placedAts).toEqual([...placedAts].sort((a, b) => b - a));
  });

  it('scopes GET /orders/:id to the owning customer', async () => {
    const customerA = await createCustomer();
    const customerB = await createCustomer();
    await seedProduct('prod-owner', { inventoryQuantity: 10 });

    const created = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerA.accessToken}`)
      .send({ lines: [{ productId: 'prod-owner', quantity: 1 }] });
    const orderId = created.body.data.id;

    const ownRes = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerA.accessToken}`);
    expect(ownRes.status).toBe(200);

    const otherRes = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerB.accessToken}`);
    expect(otherRes.status).toBe(404);
    expect(otherRes.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('cancels a cancellable order, restocks, and rejects a second cancel', async () => {
    const { accessToken } = await createCustomer();
    await seedProduct('prod-cancel', { inventoryQuantity: 10 });

    const created = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lines: [{ productId: 'prod-cancel', quantity: 4 }] });
    const orderId = created.body.data.id;

    expect((await ProductModel.findById('prod-cancel'))!.inventoryQuantity).toBe(6);

    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect((await ProductModel.findById('prod-cancel'))!.inventoryQuantity).toBe(10);

    const secondCancel = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(secondCancel.status).toBe(409);
    expect(secondCancel.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('rejects an ADMIN-role token from placing an order', async () => {
    const { accessToken } = await container.tokenService.issueTokenPair('fake-admin-id', 'ADMIN');

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lines: [{ productId: 'whatever', quantity: 1 }] });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects an empty lines array and duplicate productId lines', async () => {
    const { accessToken } = await createCustomer();

    const emptyRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lines: [] });
    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error.code).toBe('VALIDATION_ERROR');

    const dupRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        lines: [
          { productId: 'a', quantity: 1 },
          { productId: 'a', quantity: 2 },
        ],
      });
    expect(dupRes.status).toBe(400);
    expect(dupRes.body.error.code).toBe('VALIDATION_ERROR');
  });
});
