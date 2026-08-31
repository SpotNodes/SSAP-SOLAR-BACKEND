import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { CategoryModel } from '../../src/modules/catalog/category.model.js';
import { ProductModel } from '../../src/modules/catalog/product.model.js';
import { OrderModel } from '../../src/modules/orders/order.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { devOtpInbox } from '../../src/providers/otp/dev-otp-sender.js';
import {
  authSessionSchema,
  publicCategorySchema,
  publicOrderSchema,
  publicProductSchema,
  publicUserSchema,
} from '../../src/openapi/schemas.js';

// Every schema here is .strict() — an extra field the app doesn't expect (a leaked internal
// column, a forgotten debug prop) fails the parse just as loudly as a missing one. This is the
// PRD §10 "contract tests that assert responses match the app's TypeScript types" requirement:
// these schemas ARE those types, written once and shared with src/openapi/schemas.ts.

const MOBILE = '9876512345';
const MOBILE_E164 = '+919876512345';

describe('API response contracts', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
    await CategoryModel.deleteMany({});
    await ProductModel.deleteMany({});
    await OrderModel.deleteMany({});
    devOtpInbox.clear();
  });

  it('User: register/login response matches the app\'s User type exactly', async () => {
    const otpRes = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ mobile: MOBILE, purpose: 'REGISTER' });
    const { requestId } = otpRes.body.data;
    const code = devOtpInbox.get(MOBILE_E164)!;

    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ requestId, mobile: MOBILE, otp: code });
    const { verificationToken } = verifyRes.body.data;

    const registerRes = await request(app).post('/api/v1/auth/register').send({
      verificationToken,
      name: 'Contract Tester',
      mobile: MOBILE,
      email: 'contract@example.com',
      address: '1 Test St',
      cityState: 'Pune, Maharashtra',
    });

    expect(() => authSessionSchema.parse(registerRes.body.data)).not.toThrow();
    expect(() => publicUserSchema.parse(registerRes.body.data.user)).not.toThrow();
  });

  it('Category: GET /categories items match the app\'s Category contract exactly', async () => {
    await CategoryModel.create({
      _id: 'panels',
      name: 'Solar Panels',
      iconKey: 'sunny-outline',
      sortOrder: 0,
      isActive: true,
    });

    const res = await request(app).get('/api/v1/categories');
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const category of res.body.data) {
      expect(() => publicCategorySchema.parse(category)).not.toThrow();
    }
  });

  it('Product: GET /products items match the app\'s Product contract exactly', async () => {
    await ProductModel.create({
      _id: 'panel-test',
      name: 'Test Panel',
      images: ['https://example.com/img.jpg'],
      price: 5000,
      description: 'desc',
      specs: [{ label: 'Wattage', value: '400W' }],
      categoryId: 'panels',
      inventoryQuantity: 10,
      lowStockThreshold: 5,
      isActive: true,
    });

    const res = await request(app).get('/api/v1/products');
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const product of res.body.data) {
      expect(() => publicProductSchema.parse(product)).not.toThrow();
    }
  });

  it('Order: POST /orders and GET /orders/:id match the app\'s Order contract exactly', async () => {
    const user = await UserModel.create({
      name: 'Contract Tester',
      mobile: MOBILE_E164,
      email: 'contract@example.com',
      address: '1 Test St',
      cityState: 'Pune, Maharashtra',
      role: 'CUSTOMER',
      mobileVerified: true,
    });
    const { accessToken } = await container.tokenService.issueTokenPair(user._id.toString(), 'CUSTOMER');

    await ProductModel.create({
      _id: 'panel-test',
      name: 'Test Panel',
      images: ['https://example.com/img.jpg'],
      price: 5000,
      description: 'desc',
      specs: [],
      categoryId: 'panels',
      inventoryQuantity: 10,
      lowStockThreshold: 5,
      isActive: true,
    });

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ lines: [{ productId: 'panel-test', quantity: 1 }] });
    expect(() => publicOrderSchema.parse(createRes.body.data)).not.toThrow();

    const getRes = await request(app)
      .get(`/api/v1/orders/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(() => publicOrderSchema.parse(getRes.body.data)).not.toThrow();
  });
});
