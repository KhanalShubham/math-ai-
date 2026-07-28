import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');

export const notificationIdParamSchema = z.object({ notificationId: objectIdSchema });

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
