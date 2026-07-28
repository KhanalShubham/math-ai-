import type { MasteryRecord } from './mastery.types';

/**
 * Owned by `student` (DOMAIN_MODEL.md §2.9) — a per-student, per-topic
 * projection, not a source of truth. `upsertFromAttempt` is the ONLY write
 * path, and by convention (not a database constraint — MongoDB cannot
 * express "only these two call sites may write this collection") it must
 * only ever be called from mastery.service's onPracticeItemSubmitted /
 * onDiagnosticCompleted event handlers, never from a controller. If a bug
 * is ever found in mastery scores, the fix is a backfill job that replays
 * attempt history through the same handler logic — never a one-off manual
 * update.
 */
export interface MasteryRepository {
  findByStudent(studentId: string): Promise<MasteryRecord[]>;
  findByStudentAndTopic(studentId: string, topicId: string): Promise<MasteryRecord | null>;
  upsertFromAttempt(
    studentId: string,
    topicId: string,
    isCorrect: boolean,
    occurredAt: Date,
  ): Promise<MasteryRecord>;
}
