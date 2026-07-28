import { Schema, model, type InferSchemaType } from 'mongoose';
import type { ContentStatus, TopicTier } from '../../../../modules/curriculum/curriculum.types';

const topicSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    examBoard: { type: String, required: true },
    tier: {
      type: String,
      enum: ['foundation', 'higher', 'both'] satisfies TopicTier[],
      required: true,
    },
    gradeBand: { type: [Number], required: true, default: [] },
    prerequisiteTopicIds: { type: [Schema.Types.ObjectId], ref: 'Topic', required: true, default: [] },
    status: {
      type: String,
      enum: ['draft', 'published'] satisfies ContentStatus[],
      required: true,
      default: 'draft',
    },
  },
  { timestamps: true },
);

topicSchema.index({ examBoard: 1, tier: 1, gradeBand: 1 });
topicSchema.index({ status: 1 });

export type TopicDocument = InferSchemaType<typeof topicSchema>;
export const TopicModel = model('Topic', topicSchema);
