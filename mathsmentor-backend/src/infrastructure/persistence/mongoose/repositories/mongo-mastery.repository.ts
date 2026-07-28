import type { Types } from 'mongoose';
import { MasteryRecordModel } from '../models/mastery-record.model';
import type { MasteryRepository } from '../../../../modules/student/mastery.repository.interface';
import type { MasteryRecord, MasteryTrend } from '../../../../modules/student/mastery.types';

/** Weight given to the new observation — recent attempts count for more than the running average (DOMAIN_MODEL.md §2.9). */
const RECENCY_WEIGHT = 0.3;
/** Minimum score delta to call it a trend rather than noise. */
const TREND_EPSILON = 0.02;

function toMasteryRecord(doc: {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  topicId: Types.ObjectId;
  masteryScore: number;
  attemptsCount: number;
  correctCount: number;
  lastPracticedAt: Date;
  trend: MasteryTrend;
}): MasteryRecord {
  return {
    id: doc._id.toString(),
    studentId: doc.studentId.toString(),
    topicId: doc.topicId.toString(),
    masteryScore: doc.masteryScore,
    attemptsCount: doc.attemptsCount,
    correctCount: doc.correctCount,
    lastPracticedAt: doc.lastPracticedAt,
    trend: doc.trend,
  };
}

function computeTrend(previousScore: number, newScore: number): MasteryTrend {
  if (newScore > previousScore + TREND_EPSILON) return 'improving';
  if (newScore < previousScore - TREND_EPSILON) return 'declining';
  return 'stable';
}

export class MongoMasteryRepository implements MasteryRepository {
  async findByStudent(studentId: string): Promise<MasteryRecord[]> {
    const docs = await MasteryRecordModel.find({ studentId }).exec();
    return docs.map(toMasteryRecord);
  }

  async findByStudentAndTopic(studentId: string, topicId: string): Promise<MasteryRecord | null> {
    const doc = await MasteryRecordModel.findOne({ studentId, topicId }).exec();
    return doc ? toMasteryRecord(doc) : null;
  }

  /**
   * Read-then-write, not a single atomic Mongo update — acceptable because a
   * given (studentId, topicId) is written by one student's own event stream,
   * not concurrent writers. Not safe to reuse this pattern for a shared
   * counter across many actors.
   */
  async upsertFromAttempt(
    studentId: string,
    topicId: string,
    isCorrect: boolean,
    occurredAt: Date,
  ): Promise<MasteryRecord> {
    const currentResult = isCorrect ? 1 : 0;
    const existing = await MasteryRecordModel.findOne({ studentId, topicId }).exec();

    if (!existing) {
      const created = await MasteryRecordModel.create({
        studentId,
        topicId,
        masteryScore: currentResult,
        attemptsCount: 1,
        correctCount: currentResult,
        lastPracticedAt: occurredAt,
        trend: 'stable',
      });
      return toMasteryRecord(created);
    }

    const newScore =
      existing.masteryScore * (1 - RECENCY_WEIGHT) + currentResult * RECENCY_WEIGHT;
    existing.trend = computeTrend(existing.masteryScore, newScore);
    existing.masteryScore = newScore;
    existing.attemptsCount += 1;
    existing.correctCount += currentResult;
    existing.lastPracticedAt = occurredAt;
    await existing.save();

    return toMasteryRecord(existing);
  }
}
