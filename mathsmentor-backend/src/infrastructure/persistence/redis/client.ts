import Redis from 'ioredis';
import { redisConfig } from '../../../config';
import { logger } from '../../logging/logger';

export const redisClient = new Redis(redisConfig.url, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis client error');
});

export async function connectRedis(): Promise<void> {
  await redisClient.connect();
  logger.info('Redis connected');
}

export function disconnectRedis(): void {
  redisClient.disconnect();
}

export function isRedisConnected(): boolean {
  return redisClient.status === 'ready';
}
