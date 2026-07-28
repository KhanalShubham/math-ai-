import { Schema, model, type InferSchemaType } from 'mongoose';

const parentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    verifiedStudentIds: {
      type: [Schema.Types.ObjectId],
      ref: 'StudentProfile',
      required: true,
      default: [],
    },
    notificationPreferences: {
      email: { type: Boolean, required: true, default: true },
      sms: { type: Boolean, required: true, default: false },
    },
  },
  { timestamps: true },
);

parentProfileSchema.index({ verifiedStudentIds: 1 });

export type ParentProfileDocument = InferSchemaType<typeof parentProfileSchema>;
export const ParentProfileModel = model('ParentProfile', parentProfileSchema);
