import type { AnalyticsEvent, FindByStudentOptions, NewAnalyticsEvent } from './analytics.types';

/**
 * Owned by `analytics` (DOMAIN_MODEL.md §2.13). `record` is the ONLY write
 * path, and by convention (not a database constraint, same as
 * MasteryRepository's rule) it must only ever be called from
 * analytics.service's event handlers, never from a controller — every
 * AnalyticsEvent is a projection of something that already happened
 * elsewhere, not a fact this module originates.
 */
export interface AnalyticsEventRepository {
  record(event: NewAnalyticsEvent): Promise<AnalyticsEvent>;
  findByStudent(studentId: string, options?: FindByStudentOptions): Promise<AnalyticsEvent[]>;
  countByEventType(eventType: string, since?: Date): Promise<number>;
}
