import type { Types } from 'mongoose';
import { DiagnosticAttemptModel } from '../models/diagnostic-attempt.model';
import { NotFoundError } from '../../../../errors';
import type {
  AppendDiagnosticItemInput,
  DiagnosticRepository,
} from '../../../../modules/diagnostic/diagnostic.repository.interface';
import type {
  AbilityEstimatePoint,
  DiagnosticAttempt,
  DiagnosticItem,
  TopicBreakdownEntry,
} from '../../../../modules/diagnostic/diagnostic.types';

function toDiagnosticAttempt(doc: {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  status: DiagnosticAttempt['status'];
  startedAt: Date;
  completedAt?: Date | null;
  abilityEstimateHistory: AbilityEstimatePoint[];
  items: Array<Omit<DiagnosticItem, 'questionId'> & { questionId: Types.ObjectId | string }>;
  finalGradeEstimate?: number | null;
  topicBreakdown: Array<{ topicId: Types.ObjectId | string; score: number }>;
  createdAt: Date;
}): DiagnosticAttempt {
  return {
    id: doc._id.toString(),
    studentId: doc.studentId.toString(),
    status: doc.status,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt ?? null,
    // Explicit field access, not spread — schema-path accessors on Mongoose
    // subdocuments live on the prototype, so `{...subdoc}` silently drops them.
    abilityEstimateHistory: doc.abilityEstimateHistory.map((point) => ({
      afterItem: point.afterItem,
      theta: point.theta,
    })),
    items: doc.items.map((item) => ({
      questionId: item.questionId.toString(),
      presentedDifficulty: item.presentedDifficulty,
      studentAnswer: item.studentAnswer,
      isCorrect: item.isCorrect,
      timeTakenMs: item.timeTakenMs,
      hintRequested: item.hintRequested,
    })),
    finalGradeEstimate: doc.finalGradeEstimate ?? null,
    topicBreakdown: doc.topicBreakdown.map((entry) => ({
      topicId: entry.topicId.toString(),
      score: entry.score,
    })),
    createdAt: doc.createdAt,
  };
}

export class MongoDiagnosticRepository implements DiagnosticRepository {
  async findById(id: string): Promise<DiagnosticAttempt | null> {
    const doc = await DiagnosticAttemptModel.findById(id).exec();
    return doc ? toDiagnosticAttempt(doc) : null;
  }

  async findInProgressForStudent(studentId: string): Promise<DiagnosticAttempt | null> {
    const doc = await DiagnosticAttemptModel.findOne({ studentId, status: 'in_progress' }).exec();
    return doc ? toDiagnosticAttempt(doc) : null;
  }

  async create(studentId: string): Promise<DiagnosticAttempt> {
    const doc = await DiagnosticAttemptModel.create({ studentId });
    return toDiagnosticAttempt(doc);
  }

  async appendItem(
    attemptId: string,
    item: AppendDiagnosticItemInput,
  ): Promise<DiagnosticAttempt> {
    const doc = await DiagnosticAttemptModel.findById(attemptId).exec();
    if (!doc) {
      throw new NotFoundError('Diagnostic attempt not found');
    }

    const { theta, ...diagnosticItem } = item;
    doc.items.push(diagnosticItem);
    doc.abilityEstimateHistory.push({ afterItem: doc.items.length, theta });
    await doc.save();

    return toDiagnosticAttempt(doc);
  }

  async complete(
    attemptId: string,
    finalGradeEstimate: number,
    topicBreakdown: TopicBreakdownEntry[],
  ): Promise<void> {
    await DiagnosticAttemptModel.findByIdAndUpdate(attemptId, {
      status: 'completed',
      completedAt: new Date(),
      finalGradeEstimate,
      topicBreakdown,
    }).exec();
  }
}
