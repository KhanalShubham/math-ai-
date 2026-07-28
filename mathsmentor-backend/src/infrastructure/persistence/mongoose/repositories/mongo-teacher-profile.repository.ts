import type { Types } from 'mongoose';
import { TeacherProfileModel } from '../models/teacher-profile.model';
import type {
  CreateTeacherProfileInput,
  TeacherProfileRepository,
} from '../../../../modules/teacher/teacher.repository.interface';
import type { TeacherProfile } from '../../../../modules/teacher/teacher.types';

function toTeacherProfile(doc: {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  schoolId: Types.ObjectId;
  classIds: Types.ObjectId[];
  subjects: string[];
  createdAt: Date;
}): TeacherProfile {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    schoolId: doc.schoolId.toString(),
    classIds: doc.classIds.map((id) => id.toString()),
    subjects: doc.subjects,
    createdAt: doc.createdAt,
  };
}

export class MongoTeacherProfileRepository implements TeacherProfileRepository {
  async findById(id: string): Promise<TeacherProfile | null> {
    const doc = await TeacherProfileModel.findById(id).exec();
    return doc ? toTeacherProfile(doc) : null;
  }

  async findByUserId(userId: string): Promise<TeacherProfile | null> {
    const doc = await TeacherProfileModel.findOne({ userId }).exec();
    return doc ? toTeacherProfile(doc) : null;
  }

  async create(input: CreateTeacherProfileInput): Promise<TeacherProfile> {
    const doc = await TeacherProfileModel.create({
      userId: input.userId,
      schoolId: input.schoolId,
      subjects: input.subjects,
    });
    return toTeacherProfile(doc);
  }

  async addClassLink(teacherId: string, classId: string): Promise<void> {
    await TeacherProfileModel.findByIdAndUpdate(teacherId, {
      $addToSet: { classIds: classId },
    }).exec();
  }
}
