import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { OtpRequestModel } from '../../src/modules/auth/otp.model.js';
import { UserModel } from '../../src/modules/users/user.model.js';
import { devOtpInbox } from '../../src/providers/otp/dev-otp-sender.js';

const MOBILE = '9876543210';
const MOBILE_E164 = '+919876543210';

async function requestOtp(purpose: 'LOGIN' | 'REGISTER'): Promise<{ requestId: string; code: string }> {
  const res = await request(app).post('/api/v1/auth/otp/request').send({ mobile: MOBILE, purpose });
  expect(res.status).toBe(200);
  const { requestId } = res.body.data;
  const code = devOtpInbox.get(MOBILE_E164);
  if (!code) throw new Error('dev OTP sender did not record a code');
  return { requestId, code };
}

async function createExistingUser(): Promise<void> {
  await UserModel.create({
    name: 'Existing User',
    mobile: MOBILE_E164,
    email: 'e@x.com',
    address: 'addr',
    cityState: 'city',
    role: 'CUSTOMER',
    mobileVerified: true,
  });
}

describe('customer auth (OTP → verify → register/login → refresh → logout)', () => {
  beforeEach(async () => {
    await UserModel.deleteMany({});
    await OtpRequestModel.deleteMany({});
    devOtpInbox.clear();
  });

  it('registers a new account end-to-end and issues tokens', async () => {
    const { requestId, code } = await requestOtp('REGISTER');

    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ requestId, mobile: MOBILE, otp: code });
    expect(verifyRes.status).toBe(200);
    const { verificationToken } = verifyRes.body.data;

    const payload = {
      verificationToken,
      name: 'Asha Verma',
      mobile: MOBILE,
      email: 'asha@example.com',
      address: '12 MG Road',
      cityState: 'Pune, Maharashtra',
    };

    const registerRes = await request(app).post('/api/v1/auth/register').send(payload);
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.data.user).toEqual(
      expect.objectContaining({ name: 'Asha Verma', mobile: MOBILE, email: 'asha@example.com' }),
    );
    expect(registerRes.body.data.accessToken).toEqual(expect.any(String));
    expect(registerRes.body.data.refreshToken).toEqual(expect.any(String));

    // verificationToken is single-use
    const replay = await request(app).post('/api/v1/auth/register').send(payload);
    expect(replay.status).toBe(400);
    expect(replay.body.error.code).toBe('VERIFICATION_INVALID');
  });

  it('rejects OTP request for LOGIN when no account exists, and for REGISTER when one does', async () => {
    const loginAttempt = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ mobile: MOBILE, purpose: 'LOGIN' });
    expect(loginAttempt.status).toBe(404);
    expect(loginAttempt.body.error.code).toBe('ACCOUNT_NOT_FOUND');

    await createExistingUser();

    const registerAttempt = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ mobile: MOBILE, purpose: 'REGISTER' });
    expect(registerAttempt.status).toBe(409);
    expect(registerAttempt.body.error.code).toBe('ACCOUNT_EXISTS');
  });

  it('rejects a wrong OTP and locks after too many attempts', async () => {
    await createExistingUser();
    const { requestId } = await requestOtp('LOGIN');

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ requestId, mobile: MOBILE, otp: '000000' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OTP_INVALID');
    }

    const lockedRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ requestId, mobile: MOBILE, otp: '000000' });
    expect(lockedRes.status).toBe(429);
    expect(lockedRes.body.error.code).toBe('OTP_LOCKED');
  });

  it('logs in an existing user, rotates refresh tokens, and logs out', async () => {
    await createExistingUser();
    const { requestId, code } = await requestOtp('LOGIN');

    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ requestId, mobile: MOBILE, otp: code });
    const { verificationToken } = verifyRes.body.data;

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ mobile: MOBILE, verificationToken });
    expect(loginRes.status).toBe(200);
    const { accessToken, refreshToken } = loginRes.body.data;

    const meRes = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.mobile).toBe(MOBILE);

    // mobile is not editable even if the client sends it
    const patchRes = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Updated Name',
        email: 'updated@x.com',
        address: 'new addr',
        cityState: 'new city',
        mobile: '9999999999',
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.name).toBe('Updated Name');
    expect(patchRes.body.data.mobile).toBe(MOBILE);

    // refresh rotates the token — the old refresh token can no longer be reused
    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    const newRefreshToken = refreshRes.body.data.refreshToken;
    expect(newRefreshToken).not.toBe(refreshToken);

    const reuseRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe('TOKEN_INVALID');

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken: newRefreshToken });
    expect(logoutRes.status).toBe(204);

    const postLogoutRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: newRefreshToken });
    expect(postLogoutRefresh.status).toBe(401);
    expect(postLogoutRefresh.body.error.code).toBe('TOKEN_INVALID');
  });

  it('rejects unauthenticated access to /users/me', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
