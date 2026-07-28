import { Schema, model, type InferSchemaType } from 'mongoose';
import type { MasteryTrend } from '../../../../modules/student/mastery.types';

const masteryRecordSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    masteryScore: { type: Number, required: true, min: 0, max: 1 },
    attemptsCount: { type: Number, required: true, default: 0 },
    correctCount: { type: Number, required: true, default: 0 },
    lastPracticedAt: { type: Date, required: true },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining'] satisfies MasteryTrend[],
      required: true,
      default: 'stable',
    },
  },
  { timestamps: true },
);

masteryRecordSchema.index({ studentId: 1, topicId: 1 }, { unique: true });
masteryRecordSchema.index({ studentId: 1, masteryScore: 1 });

export type MasteryRecordDocument = InferSchemaType<typeof masteryRecordSchema>;
export const MasteryRecordModel = model('MasteryRecord', masteryRecordSchema);
