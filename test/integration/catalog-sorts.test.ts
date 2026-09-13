import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { ProductModel } from '../../src/modules/catalog/product.model.js';
import { OrderModel } from '../../src/modules/orders/order.model.js';
import { OrderStatus, PaymentStatus } from '../../src/core/enums.js';
import { catalogSeedProducts } from '../../src/seed/catalog-seed-data.js';

const [A, B, C] = catalogSeedProducts;

/** Insert products with controlled createdAt so "newest" has a known answer. */
async function seedProducts(): Promise<void> {
  await ProductModel.deleteMany({});
  await OrderModel.deleteMany({});
  const base = Date.now();
  for (const [index, product] of [A!, B!, C!].entries()) {
    const { id, ...data } = product;
    await ProductModel.create({
      _id: id,
      ...data,
      isActive: true,
      // index 0 oldest → index 2 newest
      createdAt: new Date(base + index * 60_000),
    });
  }
}

function order(lines: { productId: string; quantity: number }[], status: OrderStatus) {
  return {
    _id: `SSAP-TEST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    userId: 'user-1',
    lines: lines.map((l) => ({ ...l, name: 'x', price: 100 })),
    subtotal: 100,
    total: 100,
    placedAt: new Date(),
    status,
    paymentStatus: PaymentStatus.Unpaid,
    customer: { name: 'A', mobile: '9000000000', email: 'a@b.c', address: 'x', cityState: 'y' },
    statusHistory: [],
  };
}

describe('GET /products — createdAt exposure', () => {
  beforeEach(seedProducts);

  it('returns an ISO createdAt on every product', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    for (const product of res.body.data) {
      expect(Number.isNaN(Date.parse(product.createdAt))).toBe(false);
    }
  });
});

describe('GET /products?sort=newest', () => {
  beforeEach(seedProducts);

  it('orders by createdAt descending', async () => {
    const res = await request(app).get('/api/v1/products?sort=newest');
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { id: string }) => p.id)).toEqual([C!.id, B!.id, A!.id]);
  });
});

describe('GET /products?sort=bestSelling', () => {
  beforeEach(seedProducts);

  it('ranks by units sold, not by order count', async () => {
    await OrderModel.create(order([{ productId: A!.id, quantity: 1 }], OrderStatus.Delivered));
    await OrderModel.create(order([{ productId: A!.id, quantity: 1 }], OrderStatus.Delivered));
    await OrderModel.create(order([{ productId: B!.id, quantity: 9 }], OrderStatus.Delivered));

    const res = await request(app).get('/api/v1/products?sort=bestSelling');
    expect(res.status).toBe(200);
    // B sold 9 units across 1 order; A sold 2 across 2 orders.
    expect(res.body.data.map((p: { id: string }) => p.id).slice(0, 2)).toEqual([B!.id, A!.id]);
  });

  it('ignores cancelled orders — returned goods were never sold', async () => {
    await OrderModel.create(order([{ productId: A!.id, quantity: 99 }], OrderStatus.Cancelled));
    await OrderModel.create(order([{ productId: B!.id, quantity: 1 }], OrderStatus.Delivered));

    const res = await request(app).get('/api/v1/products?sort=bestSelling');
    expect(res.body.data[0].id).toBe(B!.id);
  });

  it('falls back to newest-first when nothing has sold', async () => {
    const res = await request(app).get('/api/v1/products?sort=bestSelling');
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { id: string }) => p.id)).toEqual([C!.id, B!.id, A!.id]);
  });
});
