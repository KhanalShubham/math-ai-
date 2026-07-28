import { Schema, model, type InferSchemaType } from 'mongoose';
import type { ExamBoard, StudentTier } from '../../../../modules/student/student.types';

const studentProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    displayName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    examBoard: {
      type: String,
      enum: ['AQA', 'Edexcel', 'OCR', 'WJEC'] satisfies ExamBoard[],
      required: true,
    },
    tier: {
      type: String,
      enum: ['foundation', 'higher'] satisfies StudentTier[],
      required: true,
    },
    targetGrade: { type: Number, min: 1, max: 9, default: null },
    currentEstimatedGrade: { type: Number, min: 1, max: 9, default: null },
    classIds: { type: [Schema.Types.ObjectId], ref: 'ClassGroup', required: true, default: [] },
    parentIds: { type: [Schema.Types.ObjectId], ref: 'User', required: true, default: [] },
    onboardingCompletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

studentProfileSchema.index({ classIds: 1 });
studentProfileSchema.index({ parentIds: 1 });

export type StudentProfileDocument = InferSchemaType<typeof studentProfileSchema>;
export const StudentProfileModel = model('StudentProfile', studentProfileSchema);
