import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { createStudentController } from './student.controller';
import type { StudentService } from './student.service';
import type { MasteryService } from './mastery.service';
import {
  classIdParamSchema,
  createStudentProfileSchema,
  parentIdParamSchema,
  updateStudentProfileSchema,
} from './student.validation';

export function createStudentRouter(
  studentService: StudentService,
  masteryService: MasteryService,
): Router {
  const router = Router();
  const controller = createStudentController(studentService, masteryService);

  router.post(
    '/profile',
    requireAuth,
    requireRole('student'),
    validate(createStudentProfileSchema),
    controller.createMyProfile,
  );
  router.get('/profile', requireAuth, requireRole('student'), controller.getMyProfile);
  router.patch(
    '/profile',
    requireAuth,
    requireRole('student'),
    validate(updateStudentProfileSchema),
    controller.updateMyProfile,
  );

  router.get(
    '/class/:classId',
    requireAuth,
    requireRole('teacher', 'admin'),
    validate(classIdParamSchema, 'params'),
    controller.listByClass,
  );
  router.get(
    '/parent/:parentId',
    requireAuth,
    requireRole('parent', 'admin'),
    validate(parentIdParamSchema, 'params'),
    controller.listByParent,
  );

  router.get('/mastery', requireAuth, requireRole('student'), controller.getMyMastery);

  return router;
}
