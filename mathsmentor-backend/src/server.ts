import { createApp } from './app';
import { appConfig } from './config';
import { createContainer } from './container/container';
import { connectMongo, disconnectMongo } from './infrastructure/persistence/mongoose/connection';
import { connectRedis, disconnectRedis } from './infrastructure/persistence/redis/client';
import { logger } from './infrastructure/logging/logger';

/**
 * Fire-and-forget, not awaited by main(): both clients retry with backoff on
 * their own (ioredis indefinitely by default), so awaiting connect() here
 * would hang the whole process starting up during a dependency outage.
 * /ready (§21.5) reflects live connection state in the meantime — that's the
 * mechanism for "up but not serving traffic yet," not blocking listen().
 */
function connectDependencies(): void {
  connectMongo().catch((err: unknown) => {
    logger.error({ err }, 'Initial MongoDB connection failed; will keep retrying');
  });
  connectRedis().catch((err: unknown) => {
    logger.error({ err }, 'Initial Redis connection failed; will keep retrying');
  });
}

function main(): void {
  const container = createContainer();

  connectDependencies();

  const app = createApp(container);
  const server = app.listen(appConfig.port, () => {
    logger.info(`MathsMentor AI backend listening on port ${appConfig.port}`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      void Promise.resolve()
        .then(async () => {
          await disconnectMongo();
          disconnectRedis();
          logger.info('Shutdown complete');
        })
        .catch((err: unknown) => {
          logger.error({ err }, 'Error during shutdown');
        })
        .finally(() => {
          process.exit(0);
        });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
