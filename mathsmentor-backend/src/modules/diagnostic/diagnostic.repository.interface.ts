import type { DiagnosticAttempt, DiagnosticItem, TopicBreakdownEntry } from './diagnostic.types';

export interface AppendDiagnosticItemInput extends DiagnosticItem {
  /** The ability-estimate point recorded alongside this item (DOMAIN_MODEL.md §2.7: "one entry per item administered"). */
  theta: number;
}

/**
 * Owned by this module (ARCHITECTURE.md §21.2; DOMAIN_MODEL.md §2.7).
 * Repository interface as specified there, with appendItem's input extended
 * to carry theta so items[] and abilityEstimateHistory[] are written
 * together in the one required side effect per submitted answer, rather than
 * as two separate writes to the same aggregate.
 */
export interface DiagnosticRepository {
  findById(id: string): Promise<DiagnosticAttempt | null>;
  findInProgressForStudent(studentId: string): Promise<DiagnosticAttempt | null>;
  /** All attempts (in progress, completed, or abandoned) for a student, newest first. */
  findByStudent(studentId: string): Promise<DiagnosticAttempt[]>;
  create(studentId: string): Promise<DiagnosticAttempt>;
  appendItem(attemptId: string, item: AppendDiagnosticItemInput): Promise<DiagnosticAttempt>;
  complete(
    attemptId: string,
    finalGradeEstimate: number,
    topicBreakdown: TopicBreakdownEntry[],
  ): Promise<void>;
}
