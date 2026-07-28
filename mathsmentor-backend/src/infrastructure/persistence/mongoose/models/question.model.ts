import { Schema, model, type InferSchemaType } from 'mongoose';
import type { QuestionStatus, QuestionType } from '../../../../modules/curriculum/curriculum.types';

const questionSchema = new Schema(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic', required: true },
    type: {
      type: String,
      enum: ['mcq', 'numeric', 'algebraic', 'multi-step'] satisfies QuestionType[],
      required: true,
    },
    difficulty: { type: Number, required: true, min: 1, max: 5 },
    promptText: { type: String, required: true },
    promptAssets: {
      type: [{ type: { type: String, required: true }, url: { type: String, required: true } }],
      required: true,
      default: [],
    },
    // Shape discriminated by `type` at the application layer (DOMAIN_MODEL.md §2.6) —
    // Mongoose has no native discriminated-embed support for a field this shallow.
    answerKey: { type: Schema.Types.Mixed, required: true, select: false },
    markScheme: { type: { steps: [String] }, default: null },
    tags: { type: [String], required: true, default: [] },
    status: {
      type: String,
      enum: ['draft', 'published', 'retired'] satisfies QuestionStatus[],
      required: true,
      default: 'draft',
    },
  },
  { timestamps: true },
);

questionSchema.index({ topicId: 1, difficulty: 1, status: 1 });
questionSchema.index({ tags: 1 });

export type QuestionDocument = InferSchemaType<typeof questionSchema>;
export const QuestionModel = model('Question', questionSchema);
