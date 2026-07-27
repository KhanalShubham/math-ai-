import { env } from './env';

export interface RedisConfig {
  url: string;
}

export const redisConfig: Readonly<RedisConfig> = Object.freeze({
  url: env.REDIS_URL,
});
