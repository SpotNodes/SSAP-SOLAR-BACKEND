import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';

// Must be set before any test file imports src/config/env.ts (module-load-time validation).
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-please-ignore';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-please-ignore';
process.env.ADMIN_ORIGIN ??= 'http://localhost:5173';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/ssap_solar_test';

let replSet: MongoMemoryReplSet | undefined;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet?.stop();
});
