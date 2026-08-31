import cors from 'cors';
import express, { type Request } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { v1Router } from './api/v1/router.js';
import { env } from './config/env.js';
import { errorHandler } from './core/http/error-handler.js';
import { healthRouter } from './core/http/health.route.js';
import { notFoundHandler } from './core/http/not-found.js';
import { baseRateLimiter } from './core/http/rate-limit.js';
import { requestId } from './core/http/request-id.js';
import { logger } from './core/logger/logger.js';
import { buildOpenApiDocument } from './openapi/document.js';

// ADMIN_ORIGIN doubles as the generic allow-list for every browser caller (admin dashboard +
// marketing website) — the native app talks to the API directly and needs no CORS entry.
const allowedOrigins = env.ADMIN_ORIGIN.split(',').map((origin) => origin.trim());

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as Request).id,
      autoLogging: env.NODE_ENV !== 'test',
      // req.headers is logged verbatim by default — without this, every authenticated request
      // writes its raw Bearer JWT straight into the logs (PRD §10: no PII in logs).
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        censor: '[Redacted]',
      },
    }),
  );
  app.use(
    helmet({
      // swagger-ui's bootstrap page needs an inline <script>/<style> tag — everything else keeps
      // helmet's defaults (object-src 'none', frame-ancestors 'self', etc). No other route on
      // this API renders HTML, so 'unsafe-inline' here doesn't open an XSS surface elsewhere.
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(baseRateLimiter);

  app.use(healthRouter);
  app.use('/api/v1', v1Router);

  const openApiDocument = buildOpenApiDocument();
  app.get('/openapi.json', (_req, res) => res.json(openApiDocument));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
