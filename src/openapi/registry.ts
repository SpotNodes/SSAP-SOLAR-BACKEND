import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z, type ZodTypeAny } from 'zod';
import { adminLoginSchema } from '../modules/admin/admin-auth.schema.js';
import {
  adminOrderQuerySchema,
  updateOrderPaymentSchema,
  updateOrderStatusSchema,
} from '../modules/admin/admin-order.schema.js';
import {
  adminProductQuerySchema,
  createProductSchema,
  setInventorySchema,
  updateProductSchema,
} from '../modules/admin/admin-product.schema.js';
import { createCategorySchema, updateCategorySchema } from '../modules/admin/admin-category.schema.js';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from '../modules/auth/auth.schema.js';
import { productQuerySchema } from '../modules/catalog/product.schema.js';
import { createOrderSchema } from '../modules/orders/order.schema.js';
import { updateProfileSchema } from '../modules/users/user.schema.js';
import {
  adminSessionSchema,
  authSessionSchema,
  dataEnvelope,
  errorResponseSchema,
  paginatedEnvelope,
  publicCategorySchema,
  publicOrderSchema,
  publicProductSchema,
  publicUserSchema,
  requestOtpResultSchema,
  tokenPairSchema,
  verifyOtpResultSchema,
} from './schemas.js';

const idParamSchema = z.object({ id: z.string() });

function jsonBody<T extends ZodTypeAny>(schema: T) {
  return { content: { 'application/json': { schema } } };
}

function ok<T extends ZodTypeAny>(description: string, schema: T) {
  return { description, content: { 'application/json': { schema } } };
}

const errorResponses = {
  400: { description: 'Validation error', content: { 'application/json': { schema: errorResponseSchema } } },
  401: { description: 'Unauthenticated', content: { 'application/json': { schema: errorResponseSchema } } },
  403: { description: 'Forbidden', content: { 'application/json': { schema: errorResponseSchema } } },
  404: { description: 'Not found', content: { 'application/json': { schema: errorResponseSchema } } },
  409: { description: 'Conflict', content: { 'application/json': { schema: errorResponseSchema } } },
  429: { description: 'Rate limited', content: { 'application/json': { schema: errorResponseSchema } } },
};

export function buildRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  const bearerAuth = registry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  // --- Health ------------------------------------------------------------------------------

  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Liveness check',
    responses: { 200: ok('Service is up', dataEnvelope(z.object({ status: z.string() }))) },
  });

  // --- Auth ----------------------------------------------------------------------------------

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/otp/request',
    tags: ['Auth'],
    summary: 'Request an OTP for login or registration',
    request: { body: jsonBody(requestOtpSchema) },
    responses: {
      200: ok('OTP sent', dataEnvelope(requestOtpResultSchema)),
      404: errorResponses[404],
      409: errorResponses[409],
      429: errorResponses[429],
      400: errorResponses[400],
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/otp/verify',
    tags: ['Auth'],
    summary: 'Verify an OTP code',
    request: { body: jsonBody(verifyOtpSchema) },
    responses: {
      200: ok('Verified', dataEnvelope(verifyOtpResultSchema)),
      400: errorResponses[400],
      410: { description: 'OTP expired', content: { 'application/json': { schema: errorResponseSchema } } },
      429: errorResponses[429],
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/login',
    tags: ['Auth'],
    summary: 'Complete login with a verification token',
    request: { body: jsonBody(loginSchema) },
    responses: { 200: ok('Session issued', dataEnvelope(authSessionSchema)), 400: errorResponses[400], 404: errorResponses[404] },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/register',
    tags: ['Auth'],
    summary: 'Complete registration with a verification token',
    request: { body: jsonBody(registerSchema) },
    responses: { 200: ok('Session issued', dataEnvelope(authSessionSchema)), 400: errorResponses[400], 409: errorResponses[409] },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/refresh',
    tags: ['Auth'],
    summary: 'Rotate an access/refresh token pair',
    request: { body: jsonBody(refreshTokenSchema) },
    responses: { 200: ok('New token pair', dataEnvelope(tokenPairSchema)), 401: errorResponses[401] },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/logout',
    tags: ['Auth'],
    summary: 'Revoke a refresh token',
    security: [{ [bearerAuth.name]: [] }],
    request: { body: jsonBody(refreshTokenSchema) },
    responses: { 204: { description: 'Logged out' }, 401: errorResponses[401] },
  });

  // --- Users -----------------------------------------------------------------------------------

  registry.registerPath({
    method: 'get',
    path: '/api/v1/users/me',
    tags: ['Users'],
    summary: "Get the caller's profile",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: ok('Profile', dataEnvelope(publicUserSchema)), 401: errorResponses[401] },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/me',
    tags: ['Users'],
    summary: "Update the caller's profile (mobile is immutable)",
    security: [{ [bearerAuth.name]: [] }],
    request: { body: jsonBody(updateProfileSchema) },
    responses: { 200: ok('Updated profile', dataEnvelope(publicUserSchema)), 400: errorResponses[400], 401: errorResponses[401] },
  });

  // --- Catalog ---------------------------------------------------------------------------------

  registry.registerPath({
    method: 'get',
    path: '/api/v1/categories',
    tags: ['Catalog'],
    summary: 'List active categories',
    responses: { 200: ok('Categories', dataEnvelope(z.array(publicCategorySchema))) },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/products',
    tags: ['Catalog'],
    summary: 'Search products (search, categoryId, inStock, sort, page, pageSize)',
    request: { query: productQuerySchema },
    responses: { 200: ok('Products', paginatedEnvelope(publicProductSchema)) },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/products/{id}',
    tags: ['Catalog'],
    summary: 'Get a single product',
    request: { params: idParamSchema },
    responses: { 200: ok('Product', dataEnvelope(publicProductSchema)), 404: errorResponses[404] },
  });

  // --- Orders ----------------------------------------------------------------------------------

  registry.registerPath({
    method: 'post',
    path: '/api/v1/orders',
    tags: ['Orders'],
    summary: 'Place an order (server recomputes price/total; supports Idempotency-Key header)',
    security: [{ [bearerAuth.name]: [] }],
    request: { body: jsonBody(createOrderSchema) },
    responses: {
      201: ok('Order created', dataEnvelope(publicOrderSchema)),
      400: errorResponses[400],
      401: errorResponses[401],
      403: errorResponses[403],
      409: errorResponses[409],
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/orders',
    tags: ['Orders'],
    summary: "List the caller's orders, newest-first",
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: ok('Orders', paginatedEnvelope(publicOrderSchema)), 401: errorResponses[401] },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/orders/{id}',
    tags: ['Orders'],
    summary: 'Get one of the caller\'s orders',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema },
    responses: { 200: ok('Order', dataEnvelope(publicOrderSchema)), 401: errorResponses[401], 404: errorResponses[404] },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/orders/{id}/cancel',
    tags: ['Orders'],
    summary: 'Cancel a cancellable order (restocks inventory)',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema },
    responses: {
      200: ok('Cancelled order', dataEnvelope(publicOrderSchema)),
      401: errorResponses[401],
      404: errorResponses[404],
      409: errorResponses[409],
    },
  });

  // --- Admin auth --------------------------------------------------------------------------------

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/auth/login',
    tags: ['Admin Auth'],
    summary: 'Admin email/password login',
    request: { body: jsonBody(adminLoginSchema) },
    responses: { 200: ok('Session issued', dataEnvelope(adminSessionSchema)), 401: errorResponses[401], 429: errorResponses[429] },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/auth/refresh',
    tags: ['Admin Auth'],
    summary: 'Rotate an admin token pair',
    request: { body: jsonBody(refreshTokenSchema) },
    responses: { 200: ok('New token pair', dataEnvelope(tokenPairSchema)), 401: errorResponses[401] },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/auth/logout',
    tags: ['Admin Auth'],
    summary: 'Revoke an admin refresh token',
    security: [{ [bearerAuth.name]: [] }],
    request: { body: jsonBody(refreshTokenSchema) },
    responses: { 204: { description: 'Logged out' }, 401: errorResponses[401], 403: errorResponses[403] },
  });

  // --- Admin orders --------------------------------------------------------------------------

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/orders',
    tags: ['Admin Orders'],
    summary: 'Search orders across all customers',
    security: [{ [bearerAuth.name]: [] }],
    request: { query: adminOrderQuerySchema },
    responses: { 200: ok('Orders', paginatedEnvelope(z.record(z.unknown()))), 401: errorResponses[401], 403: errorResponses[403] },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/orders/{id}',
    tags: ['Admin Orders'],
    summary: 'Get full order detail including statusHistory',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema },
    responses: { 200: ok('Order', dataEnvelope(z.record(z.unknown()))), 401: errorResponses[401], 403: errorResponses[403], 404: errorResponses[404] },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/admin/orders/{id}/status',
    tags: ['Admin Orders'],
    summary: 'Transition an order status (state-machine enforced)',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema, body: jsonBody(updateOrderStatusSchema) },
    responses: {
      200: ok('Updated order', dataEnvelope(z.record(z.unknown()))),
      400: errorResponses[400],
      401: errorResponses[401],
      403: errorResponses[403],
      404: errorResponses[404],
      409: errorResponses[409],
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/admin/orders/{id}/payment',
    tags: ['Admin Orders'],
    summary: 'Update payment status (independent of order status)',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema, body: jsonBody(updateOrderPaymentSchema) },
    responses: {
      200: ok('Updated order', dataEnvelope(z.record(z.unknown()))),
      400: errorResponses[400],
      401: errorResponses[401],
      403: errorResponses[403],
      404: errorResponses[404],
    },
  });

  // --- Admin products --------------------------------------------------------------------------

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/products',
    tags: ['Admin Catalog'],
    summary: 'Search products, including inactive ones',
    security: [{ [bearerAuth.name]: [] }],
    request: { query: adminProductQuerySchema },
    responses: { 200: ok('Products', paginatedEnvelope(z.record(z.unknown()))), 401: errorResponses[401], 403: errorResponses[403] },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/products/{id}',
    tags: ['Admin Catalog'],
    summary: 'Get a product regardless of isActive',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema },
    responses: { 200: ok('Product', dataEnvelope(z.record(z.unknown()))), 401: errorResponses[401], 403: errorResponses[403], 404: errorResponses[404] },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/products',
    tags: ['Admin Catalog'],
    summary: 'Create a product (images must be HTTPS URLs)',
    security: [{ [bearerAuth.name]: [] }],
    request: { body: jsonBody(createProductSchema) },
    responses: { 201: ok('Created product', dataEnvelope(z.record(z.unknown()))), 400: errorResponses[400], 401: errorResponses[401], 403: errorResponses[403] },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/admin/products/{id}',
    tags: ['Admin Catalog'],
    summary: 'Update product fields',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema, body: jsonBody(updateProductSchema) },
    responses: { 200: ok('Updated product', dataEnvelope(z.record(z.unknown()))), 400: errorResponses[400], 401: errorResponses[401], 403: errorResponses[403], 404: errorResponses[404] },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/v1/admin/products/{id}',
    tags: ['Admin Catalog'],
    summary: 'Soft-delete a product (isActive=false)',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema },
    responses: { 204: { description: 'Deleted' }, 401: errorResponses[401], 403: errorResponses[403], 404: errorResponses[404] },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/admin/products/{id}/inventory',
    tags: ['Admin Catalog'],
    summary: 'Set inventoryQuantity and/or lowStockThreshold',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema, body: jsonBody(setInventorySchema) },
    responses: { 200: ok('Updated product', dataEnvelope(z.record(z.unknown()))), 400: errorResponses[400], 401: errorResponses[401], 403: errorResponses[403], 404: errorResponses[404] },
  });

  // --- Admin categories ------------------------------------------------------------------------

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/categories',
    tags: ['Admin Catalog'],
    summary: 'List all categories, including inactive ones',
    security: [{ [bearerAuth.name]: [] }],
    responses: { 200: ok('Categories', dataEnvelope(z.array(z.record(z.unknown())))), 401: errorResponses[401], 403: errorResponses[403] },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/admin/categories/{id}',
    tags: ['Admin Catalog'],
    summary: 'Get a category regardless of isActive',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema },
    responses: { 200: ok('Category', dataEnvelope(z.record(z.unknown()))), 401: errorResponses[401], 403: errorResponses[403], 404: errorResponses[404] },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/admin/categories',
    tags: ['Admin Catalog'],
    summary: 'Create a category',
    security: [{ [bearerAuth.name]: [] }],
    request: { body: jsonBody(createCategorySchema) },
    responses: { 201: ok('Created category', dataEnvelope(z.record(z.unknown()))), 400: errorResponses[400], 401: errorResponses[401], 403: errorResponses[403] },
  });

  registry.registerPath({
    method: 'patch',
    path: '/api/v1/admin/categories/{id}',
    tags: ['Admin Catalog'],
    summary: 'Update a category',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema, body: jsonBody(updateCategorySchema) },
    responses: { 200: ok('Updated category', dataEnvelope(z.record(z.unknown()))), 400: errorResponses[400], 401: errorResponses[401], 403: errorResponses[403], 404: errorResponses[404] },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/v1/admin/categories/{id}',
    tags: ['Admin Catalog'],
    summary: 'Soft-delete a category (isActive=false)',
    security: [{ [bearerAuth.name]: [] }],
    request: { params: idParamSchema },
    responses: { 204: { description: 'Deleted' }, 401: errorResponses[401], 403: errorResponses[403], 404: errorResponses[404] },
  });

  return registry;
}
