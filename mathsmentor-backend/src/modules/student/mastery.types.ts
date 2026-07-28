export type MasteryTrend = 'improving' | 'stable' | 'declining';

/**
 * Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.9).
 * Owned by `student`, but this is a read model: it exists only to be
 * projected from PracticeItemSubmitted/DiagnosticCompleted events, never
 * written directly by a controller. See mastery.repository.interface.ts.
 */
export interface MasteryRecord {
  id: string;
  studentId: string;
  topicId: string;
  masteryScore: number;
  attemptsCount: number;
  correctCount: number;
  lastPracticedAt: Date;
  trend: MasteryTrend;
}
