import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './core/db/connection.js';
import { logger } from './core/logger/logger.js';

async function bootstrap(): Promise<void> {
  await connectDB(env.MONGODB_URI);

  const server = createServer(app);
  server.listen(env.PORT, () => {
    logger.info(`SSAP Solar backend listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      disconnectDB()
        .then(() => process.exit(0))
        .catch((err: unknown) => {
          logger.error({ err }, 'Error during shutdown');
          process.exit(1);
        });
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
