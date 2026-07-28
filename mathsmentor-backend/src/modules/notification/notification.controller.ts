import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import type { NotificationService } from './notification.service';
import type { ListNotificationsQuery, NotificationIdParam } from './notification.validation';

export function createNotificationController(notificationService: NotificationService) {
  return {
    listMine: asyncHandler(async (req: Request, res: Response) => {
      const { unreadOnly, limit } = req.query as unknown as ListNotificationsQuery;
      const notifications = await notificationService.listMyNotifications(req.user!.sub, {
        unreadOnly,
        limit,
      });
      res.status(200).json({ notifications });
    }),

    markRead: asyncHandler(async (req: Request, res: Response) => {
      const { notificationId } = req.params as unknown as NotificationIdParam;
      const notification = await notificationService.markRead(req.user!.sub, notificationId);
      res.status(200).json({ notification });
    }),

    markAllRead: asyncHandler(async (req: Request, res: Response) => {
      const updatedCount = await notificationService.markAllRead(req.user!.sub);
      res.status(200).json({ updatedCount });
    }),
  };
}
