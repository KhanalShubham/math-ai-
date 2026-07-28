import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { createParentController } from './parent.controller';
import type { ParentService } from './parent.service';
import {
  linkStudentSchema,
  studentIdParamSchema,
  updateNotificationPreferencesSchema,
} from './parent.validation';

export function createParentRouter(parentService: ParentService): Router {
  const router = Router();
  const controller = createParentController(parentService);

  router.post('/profile', requireAuth, requireRole('parent'), controller.createMyProfile);
  router.get('/profile', requireAuth, requireRole('parent'), controller.getMyProfile);

  router.post(
    '/links',
    requireAuth,
    requireRole('parent'),
    validate(linkStudentSchema),
    controller.linkStudent,
  );
  router.delete(
    '/links/:studentId',
    requireAuth,
    requireRole('parent'),
    validate(studentIdParamSchema, 'params'),
    controller.unlinkStudent,
  );

  router.get('/children', requireAuth, requireRole('parent'), controller.getMyChildren);
  router.get(
    '/guardians/:studentId',
    requireAuth,
    requireRole('admin'),
    validate(studentIdParamSchema, 'params'),
    controller.getGuardiansForStudent,
  );

  router.patch(
    '/preferences',
    requireAuth,
    requireRole('parent'),
    validate(updateNotificationPreferencesSchema),
    controller.updateMyNotificationPreferences,
  );

  return router;
}
