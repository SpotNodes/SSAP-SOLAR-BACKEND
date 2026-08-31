import { env } from '../config/env.js';
import { container } from '../container.js';
import { hashSecret } from '../core/auth/secret-hash.js';
import { connectDB, disconnectDB } from '../core/db/connection.js';
import { logger } from '../core/logger/logger.js';
import { CategoryModel } from '../modules/catalog/category.model.js';
import { ProductModel } from '../modules/catalog/product.model.js';
import { catalogSeedCategories, catalogSeedProducts } from './catalog-seed-data.js';

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

// Idempotent: only inserts rows that don't already exist, so re-running never duplicates and
// never clobbers admin edits made after the initial seed (once Phase 6 catalogue CRUD exists).
async function seedCatalog(): Promise<void> {
  let insertedCategories = 0;
  for (const [index, category] of catalogSeedCategories.entries()) {
    const result = await CategoryModel.updateOne(
      { _id: category.id },
      {
        $setOnInsert: {
          name: category.name,
          iconKey: category.iconKey,
          sortOrder: index,
          isActive: true,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount > 0) insertedCategories++;
  }

  let insertedProducts = 0;
  for (const product of catalogSeedProducts) {
    const { id, ...data } = product;
    const result = await ProductModel.updateOne(
      { _id: id },
      { $setOnInsert: { ...data, isActive: true } },
      { upsert: true },
    );
    if (result.upsertedCount > 0) insertedProducts++;
  }

  logger.info(
    { insertedCategories, insertedProducts, totalCategories: catalogSeedCategories.length, totalProducts: catalogSeedProducts.length },
    'Catalogue seed complete.',
  );
}

async function main(): Promise<void> {
  await connectDB(env.MONGODB_URI);
  await seedAdmin();
  await seedCatalog();
  await disconnectDB();
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
