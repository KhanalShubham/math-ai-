import type { Types } from 'mongoose';
import { StudentProfileModel } from '../models/student-profile.model';
import { NotFoundError } from '../../../../errors';
import type {
  CreateStudentProfileInput,
  StudentRepository,
  UpdateStudentProfileInput,
} from '../../../../modules/student/student.repository.interface';
import type { StudentProfile } from '../../../../modules/student/student.types';
import { computeStreakUpdate } from '../../../../modules/student/streak';

function toStudentProfile(doc: {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  displayName: string;
  dateOfBirth: Date;
  examBoard: StudentProfile['examBoard'];
  tier: StudentProfile['tier'];
  targetGrade?: number | null;
  currentEstimatedGrade?: number | null;
  classIds: Types.ObjectId[];
  parentIds: Types.ObjectId[];
  onboardingCompletedAt?: Date | null;
  currentStreakDays?: number;
  longestStreakDays?: number;
  lastActiveDate?: Date | null;
  createdAt: Date;
}): StudentProfile {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    displayName: doc.displayName,
    dateOfBirth: doc.dateOfBirth,
    examBoard: doc.examBoard,
    tier: doc.tier,
    targetGrade: doc.targetGrade ?? null,
    currentEstimatedGrade: doc.currentEstimatedGrade ?? null,
    classIds: doc.classIds.map((id) => id.toString()),
    parentIds: doc.parentIds.map((id) => id.toString()),
    onboardingCompletedAt: doc.onboardingCompletedAt ?? null,
    currentStreakDays: doc.currentStreakDays ?? 0,
    longestStreakDays: doc.longestStreakDays ?? 0,
    lastActiveDate: doc.lastActiveDate ?? null,
    createdAt: doc.createdAt,
  };
}

export class MongoStudentRepository implements StudentRepository {
  async findById(id: string): Promise<StudentProfile | null> {
    const doc = await StudentProfileModel.findById(id).exec();
    return doc ? toStudentProfile(doc) : null;
  }

  async findByUserId(userId: string): Promise<StudentProfile | null> {
    const doc = await StudentProfileModel.findOne({ userId }).exec();
    return doc ? toStudentProfile(doc) : null;
  }

  async findByClassId(classId: string): Promise<StudentProfile[]> {
    const docs = await StudentProfileModel.find({ classIds: classId }).exec();
    return docs.map(toStudentProfile);
  }

  async findByParentId(parentId: string): Promise<StudentProfile[]> {
    const docs = await StudentProfileModel.find({ parentIds: parentId }).exec();
    return docs.map(toStudentProfile);
  }

  async create(input: CreateStudentProfileInput): Promise<StudentProfile> {
    const doc = await StudentProfileModel.create({
      userId: input.userId,
      displayName: input.displayName,
      dateOfBirth: input.dateOfBirth,
      examBoard: input.examBoard,
      tier: input.tier,
      targetGrade: input.targetGrade ?? null,
    });
    return toStudentProfile(doc);
  }

  async updateProfile(
    studentId: string,
    patch: UpdateStudentProfileInput,
  ): Promise<StudentProfile> {
    const doc = await StudentProfileModel.findByIdAndUpdate(studentId, patch, { new: true }).exec();
    if (!doc) {
      throw new NotFoundError('Student profile not found');
    }
    return toStudentProfile(doc);
  }

  async updateEstimatedGrade(studentId: string, grade: number): Promise<void> {
    await StudentProfileModel.findByIdAndUpdate(studentId, {
      currentEstimatedGrade: grade,
    }).exec();
  }

  async addParentLink(studentId: string, parentUserId: string): Promise<void> {
    await StudentProfileModel.findByIdAndUpdate(studentId, {
      $addToSet: { parentIds: parentUserId },
    }).exec();
  }

  async removeParentLink(studentId: string, parentUserId: string): Promise<void> {
    await StudentProfileModel.findByIdAndUpdate(studentId, {
      $pull: { parentIds: parentUserId },
    }).exec();
  }

  async addClassLink(studentId: string, classId: string): Promise<void> {
    await StudentProfileModel.findByIdAndUpdate(studentId, {
      $addToSet: { classIds: classId },
    }).exec();
  }

  async removeClassLink(studentId: string, classId: string): Promise<void> {
    await StudentProfileModel.findByIdAndUpdate(studentId, {
      $pull: { classIds: classId },
    }).exec();
  }

  async recordActivity(studentId: string, activityDate: Date): Promise<void> {
    const doc = await StudentProfileModel.findById(studentId).exec();
    if (!doc) return;

    const updated = computeStreakUpdate(
      {
        currentStreakDays: doc.currentStreakDays ?? 0,
        longestStreakDays: doc.longestStreakDays ?? 0,
        lastActiveDate: doc.lastActiveDate ?? null,
      },
      activityDate,
    );

    doc.currentStreakDays = updated.currentStreakDays;
    doc.longestStreakDays = updated.longestStreakDays;
    doc.lastActiveDate = updated.lastActiveDate;
    await doc.save();
  }
}
