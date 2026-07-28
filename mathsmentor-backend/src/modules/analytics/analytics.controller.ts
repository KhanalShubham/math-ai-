import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/error-handler.middleware';
import type { AnalyticsService } from './analytics.service';
import type {
  EventTypeCountQuery,
  StudentIdParam,
  StudentTimelineQuery,
} from './analytics.validation';

export function createAnalyticsController(analyticsService: AnalyticsService) {
  return {
    getStudentTimeline: asyncHandler(async (req: Request, res: Response) => {
      const { studentId } = req.params as unknown as StudentIdParam;
      const { eventType, limit } = req.query as unknown as StudentTimelineQuery;
      const events = await analyticsService.getStudentTimeline(studentId, { eventType, limit });
      res.status(200).json({ events });
    }),

    getEventTypeCount: asyncHandler(async (req: Request, res: Response) => {
      const { eventType, sinceDays } = req.query as unknown as EventTypeCountQuery;
      const count = await analyticsService.getEventTypeCount(eventType, sinceDays);
      res.status(200).json({ eventType, count });
    }),
  };
}
