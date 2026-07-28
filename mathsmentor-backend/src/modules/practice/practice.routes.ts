import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import type { StudentService } from '../student/student.service';
import { createPracticeController } from './practice.controller';
import type { PracticeService } from './practice.service';
import {
  sessionIdParamSchema,
  startSessionSchema,
  submitPracticeItemSchema,
} from './practice.validation';

/** Every route is student-only — a practice session always belongs to the caller. */
export function createPracticeRouter(
  practiceService: PracticeService,
  studentService: StudentService,
): Router {
  const router = Router();
  const controller = createPracticeController(practiceService, studentService);

  router.post(
    '/sessions',
    requireAuth,
    requireRole('student'),
    validate(startSessionSchema),
    controller.start,
  );
  router.get('/sessions', requireAuth, requireRole('student'), controller.listMine);
  router.get('/sessions/current', requireAuth, requireRole('student'), controller.getCurrent);
  router.get(
    '/sessions/:sessionId',
    requireAuth,
    requireRole('student'),
    validate(sessionIdParamSchema, 'params'),
    controller.get,
  );
  router.post(
    '/sessions/:sessionId/items',
    requireAuth,
    requireRole('student'),
    validate(sessionIdParamSchema, 'params'),
    validate(submitPracticeItemSchema),
    controller.submitItem,
  );
  router.post(
    '/sessions/:sessionId/complete',
    requireAuth,
    requireRole('student'),
    validate(sessionIdParamSchema, 'params'),
    controller.complete,
  );

  return router;
}
