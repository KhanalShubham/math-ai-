import type { Request, Response } from 'express';
import { isMongoConnected } from '../persistence/mongoose/connection';
import { isRedisConnected } from '../persistence/redis/client';

/** Readiness: actively checks dependencies. An instance that's up but can't
 * reach Mongo/Redis should be pulled from load-balancer rotation. */
export function readinessHandler(_req: Request, res: Response): void {
  const checks = {
    mongo: isMongoConnected(),
    redis: isRedisConnected(),
  };
  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks });
}
