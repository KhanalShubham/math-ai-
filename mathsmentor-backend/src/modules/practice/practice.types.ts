export type PracticeSessionSource = 'self_selected' | 'teacher_assigned' | 'ai_recommended';

/** Embedded, not an aggregate root — always read/written as part of its parent session. */
export interface PracticeItem {
  questionId: string;
  studentAnswer: unknown;
  isCorrect: boolean;
  timeTakenMs: number;
  hintsUsedCount: number;
  submittedAt: Date;
}

/**
 * Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.8).
 * Structurally parallel to DiagnosticAttempt but without the adaptive
 * ability trace, finalGradeEstimate, or topicBreakdown — those don't apply
 * to a plain practice session.
 */
export interface PracticeSession {
  id: string;
  studentId: string;
  source: PracticeSessionSource;
  assignedByTeacherId: string | null;
  topicIds: string[];
  items: PracticeItem[];
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}
