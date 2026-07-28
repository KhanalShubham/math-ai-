import { Schema, model, type InferSchemaType } from 'mongoose';

const analyticsEventSchema = new Schema(
  {
    eventType: { type: String, required: true },
    aggregateType: { type: String, required: true },
    aggregateId: { type: Schema.Types.ObjectId, required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: false, default: null },
    payload: { type: Schema.Types.Mixed, required: true, default: {} },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: false },
);

analyticsEventSchema.index({ studentId: 1, occurredAt: -1 });
analyticsEventSchema.index({ eventType: 1, occurredAt: -1 });

export type AnalyticsEventDocument = InferSchemaType<typeof analyticsEventSchema>;
export const AnalyticsEventModel = model('AnalyticsEvent', analyticsEventSchema);
