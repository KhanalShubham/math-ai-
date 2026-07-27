import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { isRedisConnected, redisClient } from '../infrastructure/persistence/redis/client';
import { logger } from '../infrastructure/logging/logger';

/**
 * Redis-backed, not in-memory — an in-memory counter silently stops being
 * correct the moment there's more than one app instance, which directly
 * contradicts the horizontal-scaling target (ARCHITECTURE.md §17).
 *
 * sendCommand deliberately never rejects: rate-limit-redis's internal
 * housekeeping runs outside any request context it awaits, so a rejection
 * here can surface as an unhandled exception mid-lifetime (e.g. Redis drops
 * after the store was already built). Defense-in-depth alongside the lazy
 * construction below, which is what prevents the crash on cold start.
 */
function redisStore(prefix: string) {
  return new RedisStore({
    sendCommand: async (command: string, ...args: string[]): Promise<RedisReply> => {
      try {
        return (await redisClient.call(command, ...args)) as RedisReply;
      } catch (err) {
        logger.error({ err, command }, 'Rate limit store command failed');
        return null as unknown as RedisReply;
      }
    },
    prefix,
  });
}

/**
 * Constructing a RedisStore eagerly loads a Lua script over the connection —
 * if Redis isn't reachable yet, that load throws synchronously with nothing
 * to catch it, crashing the process before a single request is served. So
 * the underlying rate-limit-redis-backed handler is built lazily, on first
 * use, ONLY once isRedisConnected() is true — never at module load. Until
 * then, requests pass through unlimited (fail OPEN: an app that's briefly
 * unlimited is far better than one that's down).
 */
function createGuardedLimiter(
  buildLimiter: () => RequestHandler,
  outageWarning: string,
): RequestHandler {
  let built: RequestHandler | null = null;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isRedisConnected()) {
      logger.warn(outageWarning);
      next();
      return;
    }
    built ??= buildLimiter();
    built(req, res, next);
  };
}

/** Blunt, IP-based protection applied globally, before we know who the caller is. */
export const globalRateLimiter: RequestHandler = createGuardedLimiter(
  () =>
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      store: redisStore('rl:global:'),
    }),
  'Redis unavailable — global rate limiting temporarily disabled for this request',
);

/**
 * Stricter limiter for AI-backed routes, keyed by authenticated user once auth
 * exists (Phase 4) — reflects real unit-cost/latency differences vs general API
 * routes and prevents one student from starving shared Ollama capacity.
 */
export const aiRateLimiter: RequestHandler = createGuardedLimiter(
  () =>
    rateLimit({
      windowMs: 60 * 1000,
      limit: 10,
      standardHeaders: true,
      legacyHeaders: false,
      store: redisStore('rl:ai:'),
    }),
  'Redis unavailable — AI rate limiting temporarily disabled for this request',
);

/**
 * Tighter, IP-based limiter for credential-guessing-prone routes (login,
 * password reset request) — brute force / credential stuffing protection,
 * separate from the general API tier.
 */
export const authRateLimiter: RequestHandler = createGuardedLimiter(
  () =>
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      standardHeaders: true,
      legacyHeaders: false,
      store: redisStore('rl:auth:'),
    }),
  'Redis unavailable — auth rate limiting temporarily disabled for this request',
);
