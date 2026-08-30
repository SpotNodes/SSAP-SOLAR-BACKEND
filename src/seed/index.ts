import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../core/db/connection.js';
import { logger } from '../core/logger/logger.js';

async function main(): Promise<void> {
  await connectDB(env.MONGODB_URI);
  logger.info('No seed data yet — categories/products land in Phase 2, admin bootstrap in Phase 1.');
  await disconnectDB();
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
