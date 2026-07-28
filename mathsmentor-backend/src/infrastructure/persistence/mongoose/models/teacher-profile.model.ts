import { Schema, model, type InferSchemaType } from 'mongoose';

const teacherProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    classIds: { type: [Schema.Types.ObjectId], ref: 'ClassGroup', required: true, default: [] },
    subjects: { type: [String], required: true, default: [] },
  },
  { timestamps: true },
);

teacherProfileSchema.index({ schoolId: 1 });

export type TeacherProfileDocument = InferSchemaType<typeof teacherProfileSchema>;
export const TeacherProfileModel = model('TeacherProfile', teacherProfileSchema);
