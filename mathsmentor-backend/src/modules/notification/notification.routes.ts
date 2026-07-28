import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../auth/auth.middleware';
import { createNotificationController } from './notification.controller';
import type { NotificationService } from './notification.service';
import { listNotificationsQuerySchema, notificationIdParamSchema } from './notification.validation';

/** Self-scoped inbox — any authenticated role reads/manages only their own notifications. */
export function createNotificationRouter(notificationService: NotificationService): Router {
  const router = Router();
  const controller = createNotificationController(notificationService);

  router.get(
    '/',
    requireAuth,
    validate(listNotificationsQuerySchema, 'query'),
    controller.listMine,
  );

  router.patch(
    '/read-all',
    requireAuth,
    controller.markAllRead,
  );

  router.patch(
    '/:notificationId/read',
    requireAuth,
    validate(notificationIdParamSchema, 'params'),
    controller.markRead,
  );

  return router;
}
