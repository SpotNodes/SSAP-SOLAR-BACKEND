import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { EnquiryModel } from '../../src/modules/enquiries/enquiry.model.js';
import { NotificationModel } from '../../src/modules/notifications/notification.model.js';
import { devEmailOutbox } from '../../src/providers/email/dev-email-sender.js';

const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

describe('POST /enquiries', () => {
  beforeEach(async () => {
    await EnquiryModel.deleteMany({});
    await NotificationModel.deleteMany({});
    devEmailOutbox.length = 0;
  });

  it('accepts a valid public enquiry and returns a confirmation without internal fields', async () => {
    const res = await request(app).post('/api/v1/enquiries').send({
      productId: 'panel-mono-550',
      name: 'Asha Verma',
      mobile: '9876543210',
      email: 'asha@example.com',
      message: 'Interested in bulk pricing for this panel.',
      requirement: '50 units for a commercial rooftop install',
      quantity: 50,
      source: 'WEB',
    });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        productId: 'panel-mono-550',
        name: 'Asha Verma',
        mobile: '9876543210',
        email: 'asha@example.com',
        status: 'NEW',
        source: 'WEB',
      }),
    );
    expect(res.body.data.internalNote).toBeUndefined();

    const stored = await EnquiryModel.findById(res.body.data.id);
    expect(stored!.mobile).toBe('+919876543210');
  });

  it('accepts a general requirement submission with no productId', async () => {
    const res = await request(app).post('/api/v1/enquiries').send({
      name: 'Rohit Sharma',
      mobile: '9876543211',
      email: 'rohit@example.com',
      message: 'Need a quote for a full off-grid solar setup.',
      source: 'APP',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.productId).toBeUndefined();
  });

  it('rejects an invalid submission', async () => {
    const res = await request(app).post('/api/v1/enquiries').send({
      name: 'A',
      mobile: 'not-a-number',
      email: 'not-an-email',
      message: '',
      source: 'WEB',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('notifies admin (feed + email) on submission', async () => {
    const res = await request(app).post('/api/v1/enquiries').send({
      name: 'Priya Nair',
      mobile: '9876543212',
      email: 'priya@example.com',
      message: 'Do you install in Kochi?',
      source: 'WEB',
    });
    expect(res.status).toBe(201);
    await settle();

    const notifications = await NotificationModel.find({});
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.type).toBe('ENQUIRY_RECEIVED');
    expect(notifications[0]!.data).toEqual({ enquiryId: res.body.data.id });

    expect(devEmailOutbox).toHaveLength(1);
    expect(devEmailOutbox[0]!.subject).toContain('Priya Nair');
  });
});
