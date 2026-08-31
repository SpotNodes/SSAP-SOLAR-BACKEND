import argon2 from 'argon2';

// Shared by admin passwords and OTP codes — both are low-entropy-ish secrets that must never be
// stored in plaintext.
export async function hashSecret(plain: string): Promise<string> {
  return argon2.hash(plain);
}

export async function verifySecret(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}
