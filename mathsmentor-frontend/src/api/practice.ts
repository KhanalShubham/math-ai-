import { apiRequest } from './client';

export interface PracticeItemResult {
  questionId: string;
  isCorrect: boolean;
}

export interface PracticeSession {
  id: string;
  studentId: string;
  source: 'self_selected' | 'teacher_assigned' | 'ai_recommended';
  topicIds: string[];
  items: PracticeItemResult[];
  startedAt: string;
  completedAt: string | null;
}

export function startSession(token: string, topicIds: string[]) {
  return apiRequest<{ session: PracticeSession }>('/practice/sessions', {
    method: 'POST',
    body: { source: 'self_selected', topicIds },
    token,
  });
}

export function getCurrentSession(token: string) {
  return apiRequest<{ session: PracticeSession | null }>('/practice/sessions/current', { token });
}

export function listSessions(token: string) {
  return apiRequest<{ sessions: PracticeSession[] }>('/practice/sessions', { token });
}

export function submitItem(
  token: string,
  sessionId: string,
  input: { questionId: string; studentAnswer: unknown; timeTakenMs: number; hintsUsedCount: number },
) {
  return apiRequest<{ session: PracticeSession; isCorrect: boolean }>(
    `/practice/sessions/${sessionId}/items`,
    { method: 'POST', body: input, token },
  );
}

export function completeSession(token: string, sessionId: string) {
  return apiRequest<{ session: PracticeSession }>(`/practice/sessions/${sessionId}/complete`, {
    method: 'POST',
    token,
  });
}
