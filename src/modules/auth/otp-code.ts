import { randomInt, randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * True only for a local/demo setup that has explicitly opted into a predictable OTP.
 *
 * Three independent conditions must all hold, so this cannot be switched on by accident:
 * a fixed code is configured, the OTP provider is the logging stub (never a real SMS gateway),
 * and we are not running in production.
 */
export const usesFixedOtp =
  Boolean(env.DEV_FIXED_OTP) && env.OTP_PROVIDER === 'dev' && env.NODE_ENV !== 'production';

export function generateOtpCode(): string {
  if (usesFixedOtp) {
    return env.DEV_FIXED_OTP as string;
  }
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function generateOtpRequestId(): string {
  return `otp_${randomUUID()}`;
}
