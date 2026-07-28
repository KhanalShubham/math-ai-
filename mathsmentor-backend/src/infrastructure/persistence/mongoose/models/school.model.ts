import { Schema, model, type InferSchemaType } from 'mongoose';
import type { SchoolSubscriptionTier } from '../../../../modules/teacher/teacher.types';

const schoolSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: {
      line1: { type: String, default: null },
      city: { type: String, default: null },
      postalCode: { type: String, default: null },
      country: { type: String, default: null },
    },
    subscriptionTier: {
      type: String,
      enum: ['trial', 'standard', 'premium'] satisfies SchoolSubscriptionTier[],
      required: true,
    },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true },
);

export type SchoolDocument = InferSchemaType<typeof schoolSchema>;
export const SchoolModel = model('School', schoolSchema);
