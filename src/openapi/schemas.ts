import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Must run before any .openapi() call anywhere in the process — this patches ZodType's prototype
// globally, so importing this module first (openapi/document.ts does) is enough.
extendZodWithOpenApi(z);

// These response DTOs are the single source of truth for "what the API actually promises" —
// reused both for OpenAPI generation here and for the contract tests in test/contract/, so a
// schema drift shows up in both places from one edit, not two.

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
      requestId: z.string(),
      timestamp: z.string(),
    }),
  })
  .openapi('ErrorResponse');

export const paginationMetaSchema = z
  .object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
  .openapi('PaginationMeta');

export function dataEnvelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: schema });
}

export function paginatedEnvelope<T extends z.ZodTypeAny>(schema: T) {
  return z.object({ data: z.array(schema), meta: paginationMetaSchema });
}

// --- Auth / Users -----------------------------------------------------------------------------

export const publicUserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    mobile: z.string(),
    email: z.string(),
    address: z.string(),
    cityState: z.string(),
    companyName: z.string().optional(),
  })
  .strict()
  .openapi('User');

export const tokenPairSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .openapi('TokenPair');

export const authSessionSchema = tokenPairSchema.extend({ user: publicUserSchema }).openapi('AuthSession');

export const requestOtpResultSchema = z
  .object({
    requestId: z.string(),
    expiresInSeconds: z.number(),
    resendAfterSeconds: z.number(),
  })
  .openapi('RequestOtpResult');

export const verifyOtpResultSchema = z
  .object({
    verificationToken: z.string(),
    expiresInSeconds: z.number(),
  })
  .openapi('VerifyOtpResult');

export const adminSessionSchema = tokenPairSchema
  .extend({ admin: z.object({ id: z.string(), name: z.string(), email: z.string() }) })
  .openapi('AdminSession');

// --- Catalog ------------------------------------------------------------------------------------

export const publicCategorySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    iconKey: z.string(),
  })
  .strict()
  .openapi('Category');

export const productSpecSchema = z.object({ label: z.string(), value: z.string() }).strict();

export const stockStatusSchema = z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']);

export const publicProductSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    images: z.array(z.string()),
    price: z.number(),
    description: z.string(),
    specs: z.array(productSpecSchema),
    categoryId: z.string(),
    stockStatus: stockStatusSchema,
  })
  .strict()
  .openapi('Product');

// --- Orders ---------------------------------------------------------------------------------

export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

export const paymentStatusSchema = z.enum(['UNPAID', 'PAID', 'REFUNDED']);

export const orderLineSchema = z
  .object({
    productId: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
  })
  .strict();

export const orderCustomerSchema = z
  .object({
    name: z.string(),
    mobile: z.string(),
    email: z.string(),
    address: z.string(),
    cityState: z.string(),
  })
  .strict();

export const publicOrderSchema = z
  .object({
    id: z.string(),
    lines: z.array(orderLineSchema),
    subtotal: z.number(),
    total: z.number(),
    placedAt: z.string(),
    status: orderStatusSchema,
    paymentStatus: paymentStatusSchema,
    customer: orderCustomerSchema,
  })
  .strict()
  .openapi('Order');
