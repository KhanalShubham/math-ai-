import { z } from 'zod';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z.string().regex(OBJECT_ID_PATTERN, 'Invalid id');

export const studentIdParamSchema = z.object({ studentId: objectIdSchema });

export const studentTimelineQuerySchema = z.object({
  eventType: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const eventTypeCountQuerySchema = z.object({
  eventType: z.string().min(1),
  sinceDays: z.coerce.number().int().min(1).max(3650).optional(),
});

export type StudentIdParam = z.infer<typeof studentIdParamSchema>;
export type StudentTimelineQuery = z.infer<typeof studentTimelineQuerySchema>;
export type EventTypeCountQuery = z.infer<typeof eventTypeCountQuerySchema>;
