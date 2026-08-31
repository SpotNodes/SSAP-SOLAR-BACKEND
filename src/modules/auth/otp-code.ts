import { randomInt, randomUUID } from 'node:crypto';

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function generateOtpRequestId(): string {
  return `otp_${randomUUID()}`;
}
