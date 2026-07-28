import { Schema, model, type InferSchemaType } from 'mongoose';
import type { DiagnosticAttemptStatus } from '../../../../modules/diagnostic/diagnostic.types';

const diagnosticItemSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    presentedDifficulty: { type: Number, required: true, min: 1, max: 5 },
    studentAnswer: { type: Schema.Types.Mixed, required: true },
    isCorrect: { type: Boolean, required: true },
    timeTakenMs: { type: Number, required: true, min: 0 },
    hintRequested: { type: Boolean, required: true },
  },
  { _id: false },
);

const abilityEstimatePointSchema = new Schema(
  { afterItem: { type: Number, required: true }, theta: { type: Number, required: true } },
  { _id: false },
);

const topicBreakdownEntrySchema = new Schema(
  { topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true }, score: { type: Number, required: true } },
  { _id: false },
);

const diagnosticAttemptSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'] satisfies DiagnosticAttemptStatus[],
      required: true,
      default: 'in_progress',
    },
    startedAt: { type: Date, required: true, default: () => new Date() },
    completedAt: { type: Date, default: null },
    abilityEstimateHistory: { type: [abilityEstimatePointSchema], required: true, default: [] },
    items: { type: [diagnosticItemSchema], required: true, default: [] },
    finalGradeEstimate: { type: Number, min: 1, max: 9, default: null },
    topicBreakdown: { type: [topicBreakdownEntrySchema], required: true, default: [] },
  },
  { timestamps: true },
);

diagnosticAttemptSchema.index({ studentId: 1, startedAt: -1 });
diagnosticAttemptSchema.index({ status: 1 });

export type DiagnosticAttemptDocument = InferSchemaType<typeof diagnosticAttemptSchema>;
export const DiagnosticAttemptModel = model('DiagnosticAttempt', diagnosticAttemptSchema);
