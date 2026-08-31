import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { buildRegistry } from './registry.js';

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(buildRegistry().definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'SSAP Solar API',
      version: '1.0.0',
      description:
        'Catalogue + ordering backend for the SSAP Solar app, website, and admin panel. ' +
        'Machine-readable companion to the backend PRD — see the repo README for auth/error-code ' +
        'conventions not captured here (envelopes, rate limits, idempotency).',
    },
    servers: [{ description: 'This server', url: '/' }],
  });
}
