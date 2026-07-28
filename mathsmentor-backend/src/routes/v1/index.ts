import { Router } from 'express';
import type { Container } from '../../container/container';
import { createAuthRouter } from '../../modules/auth/auth.routes';
import { createStudentRouter } from '../../modules/student/student.routes';

/** Composes all module routers under /api/v1. */
export function createV1Router(container: Container): Router {
  const router = Router();

  router.use('/auth', createAuthRouter(container.authService));
  router.use('/students', createStudentRouter(container.studentService));

  return router;
}
