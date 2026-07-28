import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { createTeacherController } from './teacher.controller';
import type { TeacherService } from './teacher.service';
import {
  addTeacherToClassSchema,
  classAndStudentIdParamSchema,
  classIdParamSchema,
  createClassGroupSchema,
  createSchoolSchema,
  createTeacherProfileSchema,
  enrollStudentSchema,
  schoolIdParamSchema,
} from './teacher.validation';

export function createTeacherRouter(teacherService: TeacherService): Router {
  const router = Router();
  const controller = createTeacherController(teacherService);

  router.post(
    '/profile',
    requireAuth,
    requireRole('teacher'),
    validate(createTeacherProfileSchema),
    controller.createMyProfile,
  );
  router.get('/profile', requireAuth, requireRole('teacher'), controller.getMyProfile);

  // Schools are provisioned centrally, same as admin-authored curriculum content.
  router.post(
    '/schools',
    requireAuth,
    requireRole('admin'),
    validate(createSchoolSchema),
    controller.createSchool,
  );
  router.get(
    '/schools/:schoolId',
    requireAuth,
    validate(schoolIdParamSchema, 'params'),
    controller.getSchool,
  );

  router.post(
    '/classes',
    requireAuth,
    requireRole('teacher', 'admin'),
    validate(createClassGroupSchema),
    controller.createClass,
  );
  router.get(
    '/classes/:classId',
    requireAuth,
    validate(classIdParamSchema, 'params'),
    controller.getClass,
  );
  router.get('/classes', requireAuth, requireRole('teacher'), controller.listMyClasses);
  router.post(
    '/classes/:classId/teachers',
    requireAuth,
    requireRole('admin'),
    validate(classIdParamSchema, 'params'),
    validate(addTeacherToClassSchema),
    controller.addTeacherToClass,
  );
  router.post(
    '/classes/:classId/students',
    requireAuth,
    requireRole('teacher', 'admin'),
    validate(classIdParamSchema, 'params'),
    validate(enrollStudentSchema),
    controller.enrollStudent,
  );
  router.delete(
    '/classes/:classId/students/:studentId',
    requireAuth,
    requireRole('teacher', 'admin'),
    validate(classAndStudentIdParamSchema, 'params'),
    controller.withdrawStudent,
  );

  return router;
}
