import type { TopicBreakdownEntry } from './diagnostic.types';

export const DIAGNOSTIC_EVENTS = {
  DiagnosticCompleted: 'diagnostic.DiagnosticCompleted',
} as const;

export interface DiagnosticCompletedPayload {
  studentId: string;
  finalGradeEstimate: number;
  topicBreakdown: TopicBreakdownEntry[];
}
