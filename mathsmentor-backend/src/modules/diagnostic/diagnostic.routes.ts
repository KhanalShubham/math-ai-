import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import type { StudentService } from '../student/student.service';
import { createDiagnosticController } from './diagnostic.controller';
import type { DiagnosticService } from './diagnostic.service';
import { attemptIdParamSchema, submitItemSchema } from './diagnostic.validation';

/** Every route is student-only — a diagnostic attempt always belongs to the caller. */
export function createDiagnosticRouter(
  diagnosticService: DiagnosticService,
  studentService: StudentService,
): Router {
  const router = Router();
  const controller = createDiagnosticController(diagnosticService, studentService);

  router.post('/attempts', requireAuth, requireRole('student'), controller.start);
  router.get('/attempts/current', requireAuth, requireRole('student'), controller.getCurrent);
  router.get(
    '/attempts/:attemptId',
    requireAuth,
    requireRole('student'),
    validate(attemptIdParamSchema, 'params'),
    controller.get,
  );
  router.post(
    '/attempts/:attemptId/items',
    requireAuth,
    requireRole('student'),
    validate(attemptIdParamSchema, 'params'),
    validate(submitItemSchema),
    controller.submitItem,
  );
  router.post(
    '/attempts/:attemptId/complete',
    requireAuth,
    requireRole('student'),
    validate(attemptIdParamSchema, 'params'),
    controller.complete,
  );

  return router;
}
