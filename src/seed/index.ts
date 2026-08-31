import { container } from '../container.js';
import { hashSecret } from '../core/auth/secret-hash.js';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../core/db/connection.js';
import { logger } from '../core/logger/logger.js';

async function seedAdmin(): Promise<void> {
  if (!env.ADMIN_BOOTSTRAP_EMAIL || !env.ADMIN_BOOTSTRAP_PASSWORD) {
    logger.info('ADMIN_BOOTSTRAP_EMAIL/PASSWORD not set — skipping admin bootstrap.');
    return;
  }

  const existing = await container.adminRepository.findByEmail(env.ADMIN_BOOTSTRAP_EMAIL);
  if (existing) {
    logger.info({ email: existing.email }, 'Admin bootstrap account already exists — skipping.');
    return;
  }

  const passwordHash = await hashSecret(env.ADMIN_BOOTSTRAP_PASSWORD);
  const admin = await container.adminRepository.create({
    name: 'Admin',
    email: env.ADMIN_BOOTSTRAP_EMAIL,
    passwordHash,
  });
  logger.info({ email: admin.email }, 'Admin bootstrap account created.');
}

async function main(): Promise<void> {
  await connectDB(env.MONGODB_URI);
  await seedAdmin();
  logger.info('Categories/products seed lands in Phase 2.');
  await disconnectDB();
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
