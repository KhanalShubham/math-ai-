import { Router } from 'express';
import type { Container } from '../../container/container';
import { createAuthRouter } from '../../modules/auth/auth.routes';

/** Composes all module routers under /api/v1. */
export function createV1Router(container: Container): Router {
  const router = Router();

  router.use('/auth', createAuthRouter(container.authService));

  return router;
}
