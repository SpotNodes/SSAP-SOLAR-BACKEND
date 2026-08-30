import cors from 'cors';
import express, { type Request } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { v1Router } from './api/v1/router.js';
import { env } from './config/env.js';
import { errorHandler } from './core/http/error-handler.js';
import { healthRouter } from './core/http/health.route.js';
import { notFoundHandler } from './core/http/not-found.js';
import { baseRateLimiter } from './core/http/rate-limit.js';
import { requestId } from './core/http/request-id.js';
import { logger } from './core/logger/logger.js';

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
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(baseRateLimiter);

  app.use(healthRouter);
  app.use('/api/v1', v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
