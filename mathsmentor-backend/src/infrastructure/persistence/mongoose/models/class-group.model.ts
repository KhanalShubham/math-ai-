import { Schema, model, type InferSchemaType } from 'mongoose';
import type { ClassTier } from '../../../../modules/teacher/teacher.types';

const membershipHistoryEntrySchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date, default: null },
  },
  { _id: false },
);

const classGroupSchema = new Schema(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true },
    examBoard: { type: String, required: true },
    tier: {
      type: String,
      enum: ['foundation', 'higher'] satisfies ClassTier[],
      required: true,
    },
    teacherIds: { type: [Schema.Types.ObjectId], ref: 'User', required: true, default: [] },
    activeStudentIds: {
      type: [Schema.Types.ObjectId],
      ref: 'StudentProfile',
      required: true,
      default: [],
    },
    // Append-only (DOMAIN_MODEL.md §2.4) — enforced in mongo-class-group.repository.ts,
    // never mutate a past entry, close it with leftAt and push a new one on rejoin.
    membershipHistory: { type: [membershipHistoryEntrySchema], required: true, default: [] },
    academicYear: { type: String, required: true },
  },
  { timestamps: true },
);

classGroupSchema.index({ schoolId: 1 });
classGroupSchema.index({ teacherIds: 1 });
classGroupSchema.index({ activeStudentIds: 1 });

export type ClassGroupDocument = InferSchemaType<typeof classGroupSchema>;
export const ClassGroupModel = model('ClassGroup', classGroupSchema);
