import type { Types } from 'mongoose';
import { AnalyticsEventModel } from '../models/analytics-event.model';
import type { AnalyticsEventRepository } from '../../../../modules/analytics/analytics.repository.interface';
import type {
  AnalyticsEvent,
  FindByStudentOptions,
  NewAnalyticsEvent,
} from '../../../../modules/analytics/analytics.types';

function toAnalyticsEvent(doc: {
  _id: Types.ObjectId;
  eventType: string;
  aggregateType: string;
  aggregateId: Types.ObjectId;
  studentId?: Types.ObjectId | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}): AnalyticsEvent {
  return {
    id: doc._id.toString(),
    eventType: doc.eventType,
    aggregateType: doc.aggregateType,
    aggregateId: doc.aggregateId.toString(),
    studentId: doc.studentId ? doc.studentId.toString() : null,
    payload: doc.payload,
    occurredAt: doc.occurredAt,
  };
}

export class MongoAnalyticsEventRepository implements AnalyticsEventRepository {
  async record(event: NewAnalyticsEvent): Promise<AnalyticsEvent> {
    const created = await AnalyticsEventModel.create({
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      studentId: event.studentId,
      payload: event.payload,
      occurredAt: event.occurredAt,
    });
    return toAnalyticsEvent(created);
  }

  async findByStudent(
    studentId: string,
    options?: FindByStudentOptions,
  ): Promise<AnalyticsEvent[]> {
    const filter: Record<string, unknown> = { studentId };
    if (options?.eventType) filter.eventType = options.eventType;

    const query = AnalyticsEventModel.find(filter).sort({ occurredAt: -1 });
    if (options?.limit) query.limit(options.limit);

    const docs = await query.exec();
    return docs.map(toAnalyticsEvent);
  }

  async countByEventType(eventType: string, since?: Date): Promise<number> {
    const filter: Record<string, unknown> = { eventType };
    if (since) filter.occurredAt = { $gte: since };
    return AnalyticsEventModel.countDocuments(filter).exec();
  }
}
