import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { container } from '../../src/container.js';
import { EnquiryModel } from '../../src/modules/enquiries/enquiry.model.js';

async function createAdminToken(): Promise<string> {
  const { accessToken } = await container.tokenService.issueTokenPair('fake-admin-id', 'ADMIN');
  return accessToken;
}

async function createCustomerToken(): Promise<string> {
  const { accessToken } = await container.tokenService.issueTokenPair('fake-customer-id', 'CUSTOMER');
  return accessToken;
}

async function seedEnquiry(overrides: Partial<{ name: string; mobile: string; status: string }> = {}) {
  return EnquiryModel.create({
    name: overrides.name ?? 'Test Lead',
    mobile: overrides.mobile ?? '+919876500001',
    email: 'lead@example.com',
    message: 'Interested in solar panels.',
    source: 'WEB',
    status: overrides.status ?? 'NEW',
  });
}

describe('admin enquiries', () => {
  beforeEach(async () => {
    await EnquiryModel.deleteMany({});
  });

  it('rejects a CUSTOMER token', async () => {
    const token = await createCustomerToken();
    const res = await request(app)
      .get('/api/v1/admin/enquiries')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('lists enquiries with status and search filters', async () => {
    const adminToken = await createAdminToken();
    await seedEnquiry({ name: 'Asha Verma', mobile: '+919876500001' });
    await seedEnquiry({ name: 'Rohit Sharma', mobile: '+919876500002', status: 'CLOSED' });

    const all = await request(app)
      .get('/api/v1/admin/enquiries')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(all.body.meta.total).toBe(2);

    const filtered = await request(app)
      .get('/api/v1/admin/enquiries?status=CLOSED')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].name).toBe('Rohit Sharma');

    const searched = await request(app)
      .get('/api/v1/admin/enquiries?search=Asha')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searched.body.data).toHaveLength(1);
    expect(searched.body.data[0].name).toBe('Asha Verma');
  });

  it('gets full enquiry detail including internalNote once set', async () => {
    const adminToken = await createAdminToken();
    const enquiry = await seedEnquiry();

    const res = await request(app)
      .get(`/api/v1/admin/enquiries/${enquiry._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.internalNote).toBeUndefined();
  });

  it('updates status and internalNote', async () => {
    const adminToken = await createAdminToken();
    const enquiry = await seedEnquiry();

    const res = await request(app)
      .patch(`/api/v1/admin/enquiries/${enquiry._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONTACTED', internalNote: 'Called, will send quote by Friday.' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONTACTED');
    expect(res.body.data.internalNote).toBe('Called, will send quote by Friday.');
  });

  it('rejects an update with neither status nor internalNote', async () => {
    const adminToken = await createAdminToken();
    const enquiry = await seedEnquiry();

    const res = await request(app)
      .patch(`/api/v1/admin/enquiries/${enquiry._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 (not 500) for a malformed enquiry id', async () => {
    const adminToken = await createAdminToken();
    const res = await request(app)
      .get('/api/v1/admin/enquiries/not-a-valid-object-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ENQUIRY_NOT_FOUND');
  });

  it('returns 404 for a well-formed but nonexistent id', async () => {
    const adminToken = await createAdminToken();
    const res = await request(app)
      .get('/api/v1/admin/enquiries/6a0000000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ENQUIRY_NOT_FOUND');
  });
});
