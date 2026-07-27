import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { corsMiddleware, helmetMiddleware } from './middleware/security.middleware';
import { requestContextMiddleware } from './middleware/request-context.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { globalRateLimiter } from './middleware/rate-limit.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { metricsMiddleware, metricsHandler } from './infrastructure/observability/metrics';
import { healthHandler } from './infrastructure/observability/health';
import { readinessHandler } from './infrastructure/observability/readiness';
import { createV1Router } from './routes/v1';
import { NotFoundError } from './errors';
import type { Container } from './container/container';

function loadOpenApiDocument(): Record<string, unknown> {
  const specPath = join(__dirname, '..', 'docs', 'openapi', 'auth.yaml');
  return parseYaml(readFileSync(specPath, 'utf-8')) as Record<string, unknown>;
}

/**
 * Middleware order matters — see ARCHITECTURE.md §6:
 * security headers -> cors -> request context/logging -> metrics -> rate limit
 * -> body parsing -> versioned API routes -> error handler (always last).
 */
export function createApp(container: Container): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(requestContextMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(metricsMiddleware);

  // Platform contracts, not product API surface — unversioned, no rate limit.
  app.get('/health', healthHandler);
  app.get('/ready', readinessHandler);
  app.get('/metrics', (req, res) => {
    void metricsHandler(req, res);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(loadOpenApiDocument()));

  app.use(globalRateLimiter);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api/v1', createV1Router(container));

  // Unmatched routes get the same JSON error contract as everything else —
  // Express's default HTML 404 page never reaches a real client.
  app.use((req, _res, next) => {
    next(new NotFoundError(`No route matches ${req.method} ${req.path}`));
  });

  app.use(errorHandlerMiddleware);

  return app;
}
