import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default('info'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  ADMIN_ORIGIN: z.string().default('http://localhost:5173'),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).optional(),
  // Where new-order/cancellation email notifications go — separate from the bootstrap admin's
  // own login email, since a deployment may want alerts on a distribution list. Falls back to
  // ADMIN_BOOTSTRAP_EMAIL if unset.
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),

  OTP_PROVIDER: z.enum(['dev', 'msg91', 'twilio']).default('dev'),
  PUSH_PROVIDER: z.enum(['dev', 'expo']).default('dev'),
  EMAIL_PROVIDER: z.enum(['dev', 'smtp']).default('dev'),
  STORAGE_PROVIDER: z.enum(['dev', 'cloudinary', 's3']).default('dev'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
