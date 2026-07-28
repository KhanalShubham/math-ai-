import type { Types } from 'mongoose';
import { PracticeSessionModel } from '../models/practice-session.model';
import { NotFoundError } from '../../../../errors';
import type {
  CreatePracticeSessionInput,
  PracticeRepository,
} from '../../../../modules/practice/practice.repository.interface';
import type { PracticeItem, PracticeSession } from '../../../../modules/practice/practice.types';

function toPracticeSession(doc: {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  source: PracticeSession['source'];
  assignedByTeacherId?: Types.ObjectId | string | null;
  topicIds: Array<Types.ObjectId | string>;
  items: Array<Omit<PracticeItem, 'questionId'> & { questionId: Types.ObjectId | string }>;
  startedAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
}): PracticeSession {
  return {
    id: doc._id.toString(),
    studentId: doc.studentId.toString(),
    source: doc.source,
    assignedByTeacherId: doc.assignedByTeacherId ? doc.assignedByTeacherId.toString() : null,
    topicIds: doc.topicIds.map((id) => id.toString()),
    // Explicit field access, not spread — schema-path accessors on Mongoose
    // subdocuments live on the prototype, so `{...subdoc}` silently drops them
    // (see mongo-diagnostic.repository.ts for the bug this pattern avoids).
    items: doc.items.map((item) => ({
      questionId: item.questionId.toString(),
      studentAnswer: item.studentAnswer,
      isCorrect: item.isCorrect,
      timeTakenMs: item.timeTakenMs,
      hintsUsedCount: item.hintsUsedCount,
      submittedAt: item.submittedAt,
    })),
    startedAt: doc.startedAt,
    completedAt: doc.completedAt ?? null,
    createdAt: doc.createdAt,
  };
}

export class MongoPracticeRepository implements PracticeRepository {
  async findById(id: string): Promise<PracticeSession | null> {
    const doc = await PracticeSessionModel.findById(id).exec();
    return doc ? toPracticeSession(doc) : null;
  }

  async findInProgressForStudent(studentId: string): Promise<PracticeSession | null> {
    const doc = await PracticeSessionModel.findOne({ studentId, completedAt: null }).exec();
    return doc ? toPracticeSession(doc) : null;
  }

  async findByStudent(studentId: string): Promise<PracticeSession[]> {
    const docs = await PracticeSessionModel.find({ studentId }).sort({ startedAt: -1 }).exec();
    return docs.map(toPracticeSession);
  }

  async create(input: CreatePracticeSessionInput): Promise<PracticeSession> {
    const doc = await PracticeSessionModel.create({
      studentId: input.studentId,
      source: input.source,
      topicIds: input.topicIds,
      assignedByTeacherId: input.assignedByTeacherId ?? null,
    });
    return toPracticeSession(doc);
  }

  async appendItem(sessionId: string, item: PracticeItem): Promise<PracticeSession> {
    const doc = await PracticeSessionModel.findById(sessionId).exec();
    if (!doc) {
      throw new NotFoundError('Practice session not found');
    }

    doc.items.push(item);
    await doc.save();

    return toPracticeSession(doc);
  }

  async complete(sessionId: string): Promise<void> {
    await PracticeSessionModel.findByIdAndUpdate(sessionId, { completedAt: new Date() }).exec();
  }
}
