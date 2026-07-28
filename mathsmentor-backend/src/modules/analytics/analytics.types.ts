/**
 * Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.13).
 * `aggregateId` is a polymorphic reference (deliberately not a typed Ref)
 * since this collection spans every aggregate type in the system.
 */
export interface AnalyticsEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  studentId: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface NewAnalyticsEvent {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  studentId: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface FindByStudentOptions {
  eventType?: string;
  limit?: number;
}
