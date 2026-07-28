import { apiRequest } from './client';
import type { PublicQuestion } from './curriculum';

export interface TopicBreakdownEntry {
  topicId: string;
  score: number;
}

export interface DiagnosticAttempt {
  id: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;
  completedAt: string | null;
  finalGradeEstimate: number | null;
  topicBreakdown: TopicBreakdownEntry[];
  items: Array<{ questionId: string; isCorrect: boolean }>;
}

export function startAttempt(token: string) {
  return apiRequest<{ attempt: DiagnosticAttempt; nextQuestion: PublicQuestion | null }>(
    '/diagnostic/attempts',
    { method: 'POST', token },
  );
}

export function getCurrentAttempt(token: string) {
  return apiRequest<{ attempt: DiagnosticAttempt | null }>('/diagnostic/attempts/current', {
    token,
  });
}

export function listAttempts(token: string) {
  return apiRequest<{ attempts: DiagnosticAttempt[] }>('/diagnostic/attempts', { token });
}

export function submitItem(
  token: string,
  attemptId: string,
  input: { questionId: string; studentAnswer: unknown; timeTakenMs: number; hintRequested: boolean },
) {
  return apiRequest<{
    attempt: DiagnosticAttempt;
    isCorrect: boolean;
    nextQuestion: PublicQuestion | null;
  }>(`/diagnostic/attempts/${attemptId}/items`, { method: 'POST', body: input, token });
}

export function completeAttempt(token: string, attemptId: string) {
  return apiRequest<{ attempt: DiagnosticAttempt }>(`/diagnostic/attempts/${attemptId}/complete`, {
    method: 'POST',
    token,
  });
}
