import { Schema, model, type InferSchemaType } from 'mongoose';
import type { PracticeSessionSource } from '../../../../modules/practice/practice.types';

const practiceItemSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    studentAnswer: { type: Schema.Types.Mixed, required: true },
    isCorrect: { type: Boolean, required: true },
    timeTakenMs: { type: Number, required: true, min: 0 },
    hintsUsedCount: { type: Number, required: true, min: 0 },
    submittedAt: { type: Date, required: true },
  },
  { _id: false },
);

const practiceSessionSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    source: {
      type: String,
      enum: ['self_selected', 'teacher_assigned', 'ai_recommended'] satisfies PracticeSessionSource[],
      required: true,
    },
    assignedByTeacherId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    topicIds: { type: [Schema.Types.ObjectId], ref: 'Topic', required: true, default: [] },
    items: { type: [practiceItemSchema], required: true, default: [] },
    startedAt: { type: Date, required: true, default: () => new Date() },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

practiceSessionSchema.index({ studentId: 1, startedAt: -1 });
practiceSessionSchema.index({ assignedByTeacherId: 1 });

export type PracticeSessionDocument = InferSchemaType<typeof practiceSessionSchema>;
export const PracticeSessionModel = model('PracticeSession', practiceSessionSchema);
