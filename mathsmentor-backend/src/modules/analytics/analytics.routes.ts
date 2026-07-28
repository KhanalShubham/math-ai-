import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { createAnalyticsController } from './analytics.controller';
import type { AnalyticsService } from './analytics.service';
import {
  eventTypeCountQuerySchema,
  studentIdParamSchema,
  studentTimelineQuerySchema,
} from './analytics.validation';

/**
 * Reporting/audit reads only — admin-only, same as the guardians lookup in
 * `parent`. `analytics` never exposes a write route (see analytics.service.ts
 * doc comment): every AnalyticsEvent is projected from the event bus, not
 * submitted by a client.
 */
export function createAnalyticsRouter(analyticsService: AnalyticsService): Router {
  const router = Router();
  const controller = createAnalyticsController(analyticsService);

  router.get(
    '/students/:studentId/events',
    requireAuth,
    requireRole('admin'),
    validate(studentIdParamSchema, 'params'),
    validate(studentTimelineQuerySchema, 'query'),
    controller.getStudentTimeline,
  );

  router.get(
    '/events/count',
    requireAuth,
    requireRole('admin'),
    validate(eventTypeCountQuerySchema, 'query'),
    controller.getEventTypeCount,
  );

  return router;
}
