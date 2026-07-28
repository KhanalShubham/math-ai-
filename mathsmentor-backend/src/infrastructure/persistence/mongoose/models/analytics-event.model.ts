import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Retention window for AnalyticsEvent (DOMAIN_MODEL.md §5, PROGRESS.md AD-013)
 * — 18 months covers a full academic year plus a buffer for year-over-year
 * comparison, without keeping raw per-event student activity indefinitely
 * (a data-minimization concern, not just a storage one — see AD-013).
 */
const RETENTION_MONTHS = 18;
const RETENTION_SECONDS = RETENTION_MONTHS * 30 * 24 * 60 * 60;

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
// TTL index — MongoDB hard-deletes a document once occurredAt is this old.
// Must be a single-field index; cannot be folded into either compound index above.
analyticsEventSchema.index({ occurredAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export type AnalyticsEventDocument = InferSchemaType<typeof analyticsEventSchema>;
export const AnalyticsEventModel = model('AnalyticsEvent', analyticsEventSchema);
