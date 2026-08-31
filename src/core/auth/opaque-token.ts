import { createHash, randomBytes } from 'node:crypto';

// Opaque, high-entropy tokens (verification tokens, OTP request ids) — not the low-entropy OTP
// code itself, which uses secret-hash.ts's argon2 hashing instead.
export function generateOpaqueToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('base64url')}`;
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
