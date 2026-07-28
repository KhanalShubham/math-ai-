export const PRACTICE_EVENTS = {
  PracticeItemSubmitted: 'practice.PracticeItemSubmitted',
} as const;

/**
 * Fired per-item as each answer is submitted (DOMAIN_MODEL.md §2.8) — the
 * fine-grained event MasteryRecord/streak handlers subscribe to. Contrast
 * with diagnostic's DiagnosticCompleted, which fires once at the end of a
 * full attempt.
 */
export interface PracticeItemSubmittedPayload {
  studentId: string;
  topicId: string;
  questionId: string;
  isCorrect: boolean;
}
