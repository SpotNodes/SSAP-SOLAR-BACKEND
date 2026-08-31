import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { hashSecret } from '../../src/core/auth/secret-hash.js';
import { AdminModel } from '../../src/modules/admin/admin.model.js';

const ADMIN_EMAIL = 'admin@ssapsolar.com';
const ADMIN_PASSWORD = 'super-secret-password';

describe('admin auth', () => {
  beforeEach(async () => {
    await AdminModel.deleteMany({});
    await AdminModel.create({
      name: 'Admin',
      email: ADMIN_EMAIL,
      passwordHash: await hashSecret(ADMIN_PASSWORD),
    });
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    const bad = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'wrong-password' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');

    const ok = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(ok.status).toBe(200);
    expect(ok.body.data.admin).toEqual(expect.objectContaining({ email: ADMIN_EMAIL }));
    expect(ok.body.data.accessToken).toEqual(expect.any(String));
    expect(ok.body.data.refreshToken).toEqual(expect.any(String));
  });

  it('rejects login for an unknown email with the same error as a wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: 'nobody@ssapsolar.com', password: ADMIN_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates admin refresh tokens and logs out', async () => {
    const login = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const { accessToken, refreshToken } = login.body.data;

    const refreshRes = await request(app).post('/api/v1/admin/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);

    const logoutRes = await request(app)
      .post('/api/v1/admin/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken: refreshRes.body.data.refreshToken });
    expect(logoutRes.status).toBe(204);
  });

  it('rejects a CUSTOMER-role token on admin-only routes', async () => {
    const { accessToken } = await container.tokenService.issueTokenPair('fake-customer-id', 'CUSTOMER');

    const res = await request(app)
      .post('/api/v1/admin/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken: 'irrelevant' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
