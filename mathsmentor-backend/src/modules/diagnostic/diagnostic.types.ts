export type DiagnosticAttemptStatus = 'in_progress' | 'completed' | 'abandoned';

/** One entry per item administered — an IRT-style ability trace (DOMAIN_MODEL.md §2.7). */
export interface AbilityEstimatePoint {
  afterItem: number;
  theta: number;
}

export interface TopicBreakdownEntry {
  topicId: string;
  score: number;
}

/** Embedded, not an aggregate root — always read/written as part of its parent attempt. */
export interface DiagnosticItem {
  questionId: string;
  presentedDifficulty: number;
  studentAnswer: unknown;
  isCorrect: boolean;
  timeTakenMs: number;
  hintRequested: boolean;
}

/** Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.7). */
export interface DiagnosticAttempt {
  id: string;
  studentId: string;
  status: DiagnosticAttemptStatus;
  startedAt: Date;
  completedAt: Date | null;
  abilityEstimateHistory: AbilityEstimatePoint[];
  items: DiagnosticItem[];
  finalGradeEstimate: number | null;
  topicBreakdown: TopicBreakdownEntry[];
  createdAt: Date;
}
