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

  it('lists all 16 seeded products with a paginated envelope and derived stockStatus', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 20, total: 16, totalPages: 1 });
    expect(res.body.data).toHaveLength(16);

    const panel = res.body.data.find((p: { id: string }) => p.id === 'panel-mono-550');
    expect(panel).toEqual(
      expect.objectContaining({
        id: 'panel-mono-550',
        name: 'Monocrystalline 550W Solar Panel',
        price: 14999,
        categoryId: 'panels',
        stockStatus: 'IN_STOCK',
      }),
    );
    // internal fields never leak
    expect(panel.inventoryQuantity).toBeUndefined();
    expect(panel.lowStockThreshold).toBeUndefined();
    expect(panel.isActive).toBeUndefined();

    const outOfStock = res.body.data.find((p: { id: string }) => p.id === 'panel-bifacial-450');
    expect(outOfStock.stockStatus).toBe('OUT_OF_STOCK');
    const lowStock = res.body.data.find((p: { id: string }) => p.id === 'inverter-ongrid-10kw');
    expect(lowStock.stockStatus).toBe('LOW_STOCK');
  });

  it('filters by categoryId', async () => {
    const res = await request(app).get('/api/v1/products?categoryId=batteries');
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.every((p: { categoryId: string }) => p.categoryId === 'batteries')).toBe(true);
  });

  it('searches case-insensitively by substring on name', async () => {
    const res = await request(app).get('/api/v1/products?search=lithium');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((p: { id: string }) => p.id).sort()).toEqual([
      'battery-lithium-100ah',
      'battery-lithium-200ah',
    ]);

    const upperCase = await request(app).get('/api/v1/products?search=MONO');
    expect(upperCase.body.data.length).toBeGreaterThan(0);
  });

  it('inStock=true excludes OUT_OF_STOCK but keeps LOW_STOCK', async () => {
    const res = await request(app).get('/api/v1/products?inStock=true');
    const ids = res.body.data.map((p: { id: string }) => p.id);
    expect(ids).not.toContain('panel-bifacial-450'); // OUT_OF_STOCK
    expect(ids).not.toContain('battery-lithium-200ah'); // OUT_OF_STOCK
    expect(ids).toContain('inverter-ongrid-10kw'); // LOW_STOCK, still counts as available
    expect(res.body.meta.total).toBe(14);
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
    expect(res.body.meta).toEqual({ page: 2, pageSize: 5, total: 16, totalPages: 4 });
  });

  it('excludes inactive products from listing', async () => {
    await ProductModel.updateOne({ _id: 'panel-mono-550' }, { isActive: false });
    const res = await request(app).get('/api/v1/products');
    expect(res.body.meta.total).toBe(15);
    expect(res.body.data.some((p: { id: string }) => p.id === 'panel-mono-550')).toBe(false);
  });
});

describe('GET /products/:id', () => {
  beforeEach(seed);

  it('returns a single product', async () => {
    const res = await request(app).get('/api/v1/products/panel-mono-550');
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Monocrystalline 550W Solar Panel');
    expect(res.body.data.specs).toEqual([
      { label: 'Wattage', value: '550W' },
      { label: 'Cell Type', value: 'Monocrystalline PERC' },
      { label: 'Efficiency', value: '21.3%' },
      { label: 'Dimensions', value: '2280 x 1134 x 35 mm' },
      { label: 'Warranty', value: '25 years performance' },
    ]);
  });

  it('returns 404 PRODUCT_NOT_FOUND for an unknown id', async () => {
    const res = await request(app).get('/api/v1/products/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns 404 for an inactive product', async () => {
    await ProductModel.updateOne({ _id: 'panel-mono-550' }, { isActive: false });
    const res = await request(app).get('/api/v1/products/panel-mono-550');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
