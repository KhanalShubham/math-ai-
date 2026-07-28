import type { Types } from 'mongoose';
import { ClassGroupModel } from '../models/class-group.model';
import { NotFoundError } from '../../../../errors';
import type {
  ClassGroupRepository,
  CreateClassGroupInput,
} from '../../../../modules/teacher/teacher.repository.interface';
import type {
  ClassGroup,
  MembershipHistoryEntry,
} from '../../../../modules/teacher/teacher.types';

function toClassGroup(doc: {
  _id: Types.ObjectId;
  schoolId: Types.ObjectId;
  name: string;
  examBoard: string;
  tier: ClassGroup['tier'];
  teacherIds: Types.ObjectId[];
  activeStudentIds: Types.ObjectId[];
  membershipHistory: Array<{ studentId: Types.ObjectId; joinedAt: Date; leftAt?: Date | null }>;
  academicYear: string;
  createdAt: Date;
}): ClassGroup {
  return {
    id: doc._id.toString(),
    schoolId: doc.schoolId.toString(),
    name: doc.name,
    examBoard: doc.examBoard,
    tier: doc.tier,
    teacherIds: doc.teacherIds.map((id) => id.toString()),
    activeStudentIds: doc.activeStudentIds.map((id) => id.toString()),
    // Explicit field access, not spread — Mongoose subdocument schema-path
    // accessors live on the prototype, so `{...subdoc}` silently drops them.
    membershipHistory: doc.membershipHistory.map((entry) => ({
      studentId: entry.studentId.toString(),
      joinedAt: entry.joinedAt,
      leftAt: entry.leftAt ?? null,
    })),
    academicYear: doc.academicYear,
    createdAt: doc.createdAt,
  };
}

export class MongoClassGroupRepository implements ClassGroupRepository {
  async findById(id: string): Promise<ClassGroup | null> {
    const doc = await ClassGroupModel.findById(id).exec();
    return doc ? toClassGroup(doc) : null;
  }

  async findBySchool(schoolId: string): Promise<ClassGroup[]> {
    const docs = await ClassGroupModel.find({ schoolId }).exec();
    return docs.map(toClassGroup);
  }

  async findByTeacher(teacherUserId: string): Promise<ClassGroup[]> {
    const docs = await ClassGroupModel.find({ teacherIds: teacherUserId }).exec();
    return docs.map(toClassGroup);
  }

  async create(input: CreateClassGroupInput): Promise<ClassGroup> {
    const doc = await ClassGroupModel.create({
      schoolId: input.schoolId,
      name: input.name,
      examBoard: input.examBoard,
      tier: input.tier,
      academicYear: input.academicYear,
    });
    return toClassGroup(doc);
  }

  async addTeacher(classId: string, teacherUserId: string): Promise<void> {
    await ClassGroupModel.findByIdAndUpdate(classId, {
      $addToSet: { teacherIds: teacherUserId },
    }).exec();
  }

  async enrollStudent(classId: string, studentId: string, joinedAt: Date): Promise<ClassGroup> {
    const doc = await ClassGroupModel.findById(classId).exec();
    if (!doc) {
      throw new NotFoundError('Class not found');
    }

    const entry: MembershipHistoryEntry = { studentId, joinedAt, leftAt: null };
    doc.membershipHistory.push(entry);
    if (!doc.activeStudentIds.some((id) => id.toString() === studentId)) {
      doc.activeStudentIds.push(studentId as unknown as Types.ObjectId);
    }
    await doc.save();

    return toClassGroup(doc);
  }

  async withdrawStudent(classId: string, studentId: string, leftAt: Date): Promise<ClassGroup> {
    const doc = await ClassGroupModel.findById(classId).exec();
    if (!doc) {
      throw new NotFoundError('Class not found');
    }

    doc.activeStudentIds = doc.activeStudentIds.filter((id) => id.toString() !== studentId);

    // Close the one OPEN entry for this student — never mutate a closed
    // (already-left) entry, so a student's full join/leave history survives
    // across multiple stints in the same class.
    const openEntry = [...doc.membershipHistory]
      .reverse()
      .find((entry) => entry.studentId.toString() === studentId && !entry.leftAt);
    if (openEntry) {
      openEntry.leftAt = leftAt;
    }
    await doc.save();

    return toClassGroup(doc);
  }
}
