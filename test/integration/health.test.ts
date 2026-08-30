import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';

describe('GET /health', () => {
  it('returns ok status in the standard success envelope', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: expect.objectContaining({ status: 'ok' }),
    });
    expect(typeof res.body.data.uptime).toBe('number');
    expect(typeof res.body.data.timestamp).toBe('string');
  });
});

describe('unknown routes', () => {
  it('returns the standard error envelope with a request id', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(
      expect.objectContaining({
        code: 'ROUTE_NOT_FOUND',
        requestId: expect.any(String),
        timestamp: expect.any(String),
      }),
    );
  });
});
