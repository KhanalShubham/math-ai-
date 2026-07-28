import type { PracticeItem, PracticeSession, PracticeSessionSource } from './practice.types';

export interface CreatePracticeSessionInput {
  studentId: string;
  source: PracticeSessionSource;
  topicIds: string[];
  assignedByTeacherId?: string | null;
}

/**
 * Owned by this module (ARCHITECTURE.md §21.2; DOMAIN_MODEL.md §2.8) — "same
 * shape as DiagnosticRepository, substituting PracticeSession/PracticeItem",
 * minus the fields that don't apply here (no ability trace, no
 * finalGradeEstimate/topicBreakdown — a practice session has neither).
 */
export interface PracticeRepository {
  findById(id: string): Promise<PracticeSession | null>;
  findInProgressForStudent(studentId: string): Promise<PracticeSession | null>;
  /** All sessions (in progress or completed) for a student, newest first. */
  findByStudent(studentId: string): Promise<PracticeSession[]>;
  create(input: CreatePracticeSessionInput): Promise<PracticeSession>;
  appendItem(sessionId: string, item: PracticeItem): Promise<PracticeSession>;
  complete(sessionId: string): Promise<void>;
}
