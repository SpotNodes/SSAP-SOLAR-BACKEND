import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { CategoryModel } from '../../src/modules/catalog/category.model.js';
import { ProductModel } from '../../src/modules/catalog/product.model.js';
import { catalogSeedCategories, catalogSeedProducts } from '../../src/seed/catalog-seed-data.js';

async function seed(): Promise<void> {
  await CategoryModel.deleteMany({});
  await ProductModel.deleteMany({});

  await CategoryModel.insertMany(
    catalogSeedCategories.map((category, index) => ({
      _id: category.id,
      name: category.name,
      iconKey: category.iconKey,
      sortOrder: index,
      isActive: true,
    })),
  );

  await ProductModel.insertMany(
    catalogSeedProducts.map(({ id, ...data }) => ({ _id: id, ...data, isActive: true })),
  );

  // Categories are read through a TTL cache (Phase 7) — direct Mongoose writes in these tests
  // don't go through the admin service that invalidates it, so force a cold read each test.
  container.categoryService.invalidate();
}

// Expectations are DERIVED from the seed rather than hard-coded, so editing the catalogue
// (adding a product, changing a price) can't silently rot these tests.
const TOTAL = catalogSeedProducts.length;
const idsWhere = (fn: (p: (typeof catalogSeedProducts)[number]) => boolean) =>
  catalogSeedProducts.filter(fn).map((p) => p.id);
const OUT_OF_STOCK = idsWhere((p) => p.inventoryQuantity === 0);
const LOW_STOCK = idsWhere((p) => p.inventoryQuantity > 0 && p.inventoryQuantity <= p.lowStockThreshold);
const AVAILABLE = TOTAL - OUT_OF_STOCK.length;
const SAMPLE = catalogSeedProducts[0];
const WITH_VARIANTS = catalogSeedProducts.find((p) => (p.variants?.length ?? 0) > 1)!;

describe('GET /categories', () => {
  beforeEach(seed);

  it('returns all active categories sorted by sortOrder, with no internal fields', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.data[0]).toEqual({ id: 'panels', name: 'Solar Panels', iconKey: 'sunny-outline' });
    expect(res.body.data.map((c: { id: string }) => c.id)).toEqual([
      'panels',
      'inverters',
      'batteries',
      'mounting',
      'controllers',
      'accessories',
    ]);
  });

  it('excludes inactive categories', async () => {
    await CategoryModel.updateOne({ _id: 'accessories' }, { isActive: false });
    const res = await request(app).get('/api/v1/categories');
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data.some((c: { id: string }) => c.id === 'accessories')).toBe(false);
  });
});

describe('GET /products', () => {
  beforeEach(seed);

  it('lists every seeded product with a paginated envelope and derived stockStatus', async () => {
    const res = await request(app).get(`/api/v1/products?pageSize=${TOTAL}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: TOTAL, total: TOTAL, totalPages: 1 });
    expect(res.body.data).toHaveLength(TOTAL);

    const panel = res.body.data.find((p: { id: string }) => p.id === SAMPLE.id);
    expect(panel).toEqual(
      expect.objectContaining({
        id: SAMPLE.id,
        name: SAMPLE.name,
        price: SAMPLE.price,
        categoryId: SAMPLE.categoryId,
        stockStatus: 'IN_STOCK',
      }),
    );
    // internal fields never leak
    expect(panel.inventoryQuantity).toBeUndefined();
    expect(panel.lowStockThreshold).toBeUndefined();
    expect(panel.isActive).toBeUndefined();

    expect(OUT_OF_STOCK.length).toBeGreaterThan(0);
    for (const id of OUT_OF_STOCK) {
      expect(res.body.data.find((p: { id: string }) => p.id === id).stockStatus).toBe('OUT_OF_STOCK');
    }
    expect(LOW_STOCK.length).toBeGreaterThan(0);
    for (const id of LOW_STOCK) {
      expect(res.body.data.find((p: { id: string }) => p.id === id).stockStatus).toBe('LOW_STOCK');
    }
  });

  it('exposes variants and variantLabel for multi-option products', async () => {
    const res = await request(app).get(`/api/v1/products/${WITH_VARIANTS.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.variantLabel).toBe(WITH_VARIANTS.variantLabel);
    expect(res.body.data.variants).toEqual(WITH_VARIANTS.variants);
  });

  it('omits variant fields entirely for single-option products', async () => {
    const single = catalogSeedProducts.find((p) => !p.variants)!;
    const res = await request(app).get(`/api/v1/products/${single.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('variantLabel');
    expect(res.body.data).not.toHaveProperty('variants');
  });

  it('filters by categoryId', async () => {
    const expected = idsWhere((p) => p.categoryId === 'batteries');
    const res = await request(app).get('/api/v1/products?categoryId=batteries');
    expect(res.body.data).toHaveLength(expected.length);
    expect(res.body.data.every((p: { categoryId: string }) => p.categoryId === 'batteries')).toBe(true);
  });

  it('searches case-insensitively by substring on name', async () => {
    const expected = idsWhere((p) => /tubular/i.test(p.name)).sort();
    expect(expected.length).toBeGreaterThan(0);

    const res = await request(app).get('/api/v1/products?search=tubular');
    expect(res.body.data.map((p: { id: string }) => p.id).sort()).toEqual(expected);

    const upperCase = await request(app).get('/api/v1/products?search=TUBULAR');
    expect(upperCase.body.data.map((p: { id: string }) => p.id).sort()).toEqual(expected);
  });

  it('inStock=true excludes OUT_OF_STOCK but keeps LOW_STOCK', async () => {
    const res = await request(app).get(`/api/v1/products?inStock=true&pageSize=${TOTAL}`);
    const ids = res.body.data.map((p: { id: string }) => p.id);
    for (const id of OUT_OF_STOCK) expect(ids).not.toContain(id);
    // LOW_STOCK still counts as available
    for (const id of LOW_STOCK) expect(ids).toContain(id);
    expect(res.body.meta.total).toBe(AVAILABLE);
  });

  it('sorts by price', async () => {
    const lowHigh = await request(app).get('/api/v1/products?sort=priceLowHigh');
    const lowHighPrices = lowHigh.body.data.map((p: { price: number }) => p.price);
    expect(lowHighPrices).toEqual([...lowHighPrices].sort((a, b) => a - b));

    const highLow = await request(app).get('/api/v1/products?sort=priceHighLow');
    const highLowPrices = highLow.body.data.map((p: { price: number }) => p.price);
    expect(highLowPrices).toEqual([...highLowPrices].sort((a, b) => b - a));
  });

  it('paginates', async () => {
    const res = await request(app).get('/api/v1/products?page=2&pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toEqual({
      page: 2,
      pageSize: 5,
      total: TOTAL,
      totalPages: Math.ceil(TOTAL / 5),
    });
  });

  it('excludes inactive products from listing', async () => {
    await ProductModel.updateOne({ _id: SAMPLE.id }, { isActive: false });
    const res = await request(app).get(`/api/v1/products?pageSize=${TOTAL}`);
    expect(res.body.meta.total).toBe(TOTAL - 1);
    expect(res.body.data.some((p: { id: string }) => p.id === SAMPLE.id)).toBe(false);
  });
});

describe('GET /products/:id', () => {
  beforeEach(seed);

  it('returns a single product', async () => {
    const res = await request(app).get(`/api/v1/products/${SAMPLE.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(SAMPLE.name);
    expect(res.body.data.specs).toEqual(SAMPLE.specs);
    expect(res.body.data.images).toEqual(SAMPLE.images);
  });

  it('returns 404 PRODUCT_NOT_FOUND for an unknown id', async () => {
    const res = await request(app).get('/api/v1/products/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns 404 for an inactive product', async () => {
    await ProductModel.updateOne({ _id: SAMPLE.id }, { isActive: false });
    const res = await request(app).get(`/api/v1/products/${SAMPLE.id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
