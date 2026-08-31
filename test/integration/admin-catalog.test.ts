import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { CategoryModel } from '../../src/modules/catalog/category.model.js';
import { ProductModel } from '../../src/modules/catalog/product.model.js';

async function createAdminToken(): Promise<string> {
  const { accessToken } = await container.tokenService.issueTokenPair('fake-admin-id', 'ADMIN');
  return accessToken;
}

async function createCustomerToken(): Promise<string> {
  const { accessToken } = await container.tokenService.issueTokenPair('fake-customer-id', 'CUSTOMER');
  return accessToken;
}

describe('admin catalogue', () => {
  beforeEach(async () => {
    await ProductModel.deleteMany({});
    await CategoryModel.deleteMany({});
  });

  describe('products', () => {
    it('rejects a CUSTOMER token', async () => {
      const token = await createCustomerToken();
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('creates a product, rejects a duplicate id and a non-HTTPS image URL', async () => {
      const adminToken = await createAdminToken();
      const payload = {
        id: 'panel-test',
        name: 'Test Panel',
        images: ['https://example.com/img.jpg'],
        price: 5000,
        description: 'A panel',
        specs: [{ label: 'Wattage', value: '400W' }],
        categoryId: 'panels',
        inventoryQuantity: 10,
        lowStockThreshold: 5,
      };

      const created = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      expect(created.status).toBe(201);
      expect(created.body.data.stockStatus).toBe('IN_STOCK');

      const dup = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      expect(dup.status).toBe(400);
      expect(dup.body.error.code).toBe('VALIDATION_ERROR');

      const badUrl = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...payload, id: 'panel-test-2', images: ['http://example.com/img.jpg'] });
      expect(badUrl.status).toBe(400);
      expect(badUrl.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('updates, soft-deletes, and manages inventory', async () => {
      const adminToken = await createAdminToken();
      await ProductModel.create({
        _id: 'prod-a',
        name: 'A',
        images: ['https://example.com/a.jpg'],
        price: 100,
        description: 'd',
        specs: [],
        categoryId: 'panels',
        inventoryQuantity: 10,
        lowStockThreshold: 5,
        isActive: true,
      });

      const patchRes = await request(app)
        .patch('/api/v1/admin/products/prod-a')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 200 });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.price).toBe(200);

      const invRes = await request(app)
        .patch('/api/v1/admin/products/prod-a/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ inventoryQuantity: 2 });
      expect(invRes.status).toBe(200);
      expect(invRes.body.data.stockStatus).toBe('LOW_STOCK');

      const delRes = await request(app)
        .delete('/api/v1/admin/products/prod-a')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(204);

      const customerList = await request(app).get('/api/v1/products');
      expect(customerList.body.data.some((p: { id: string }) => p.id === 'prod-a')).toBe(false);

      const adminGet = await request(app)
        .get('/api/v1/admin/products/prod-a')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminGet.status).toBe(200);
      expect(adminGet.body.data.isActive).toBe(false);
    });

    it('returns 404 for an unknown product', async () => {
      const adminToken = await createAdminToken();
      const res = await request(app)
        .get('/api/v1/admin/products/nope')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('categories', () => {
    it('creates, updates, and soft-deletes a category', async () => {
      const adminToken = await createAdminToken();

      const created = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: 'new-cat', name: 'New Category', iconKey: 'star-outline' });
      expect(created.status).toBe(201);

      const patched = await request(app)
        .patch('/api/v1/admin/categories/new-cat')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Renamed' });
      expect(patched.status).toBe(200);
      expect(patched.body.data.name).toBe('Renamed');

      const del = await request(app)
        .delete('/api/v1/admin/categories/new-cat')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(del.status).toBe(204);

      const customerList = await request(app).get('/api/v1/categories');
      expect(customerList.body.data.some((c: { id: string }) => c.id === 'new-cat')).toBe(false);

      const adminList = await request(app)
        .get('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(
        adminList.body.data.some(
          (c: { id: string; isActive: boolean }) => c.id === 'new-cat' && c.isActive === false,
        ),
      ).toBe(true);
    });

    it('rejects a duplicate category id', async () => {
      const adminToken = await createAdminToken();
      await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: 'dup-cat', name: 'A', iconKey: 'x' });

      const dup = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ id: 'dup-cat', name: 'B', iconKey: 'y' });
      expect(dup.status).toBe(400);
      expect(dup.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
