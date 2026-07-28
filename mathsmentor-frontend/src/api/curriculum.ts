import { apiRequest } from './client';

export interface Topic {
  id: string;
  name: string;
  examBoard: string;
  tier: 'foundation' | 'higher' | 'both';
  gradeBand: number[];
  status: 'draft' | 'published';
}

export interface PublicQuestion {
  id: string;
  topicId: string;
  type: 'mcq' | 'numeric' | 'algebraic' | 'multi-step';
  difficulty: number;
  promptText: string;
  status: 'draft' | 'published' | 'retired';
}

export function listPublishedTopics(token: string) {
  return apiRequest<{ topics: Topic[] }>('/curriculum/topics', {
    token,
    query: { status: 'published' },
  });
}

export function listQuestionsForTopic(token: string, topicId: string) {
  return apiRequest<{ questions: PublicQuestion[] }>('/curriculum/questions', {
    token,
    query: { topicId },
  });
}
