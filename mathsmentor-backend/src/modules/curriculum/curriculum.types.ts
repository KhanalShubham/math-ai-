export type ContentStatus = 'draft' | 'published';
export type QuestionStatus = 'draft' | 'published' | 'retired';
export type TopicTier = 'foundation' | 'higher' | 'both';
export type QuestionType = 'mcq' | 'numeric' | 'algebraic' | 'multi-step';

/** Plain domain shape — never the Mongoose document (DOMAIN_MODEL.md §2.5). */
export interface Topic {
  id: string;
  name: string;
  examBoard: string;
  tier: TopicTier;
  gradeBand: number[];
  prerequisiteTopicIds: string[];
  status: ContentStatus;
  createdAt: Date;
}

export interface PromptAsset {
  type: string;
  url: string;
}

export type AnswerKey =
  | { correctOptionId: string }
  | { value: number; tolerance: number }
  | { acceptedForms: string[]; equivalenceRule: 'symbolic' }
  | { steps: Array<{ stepAnswerKey?: unknown }> };

export interface MarkScheme {
  steps: string[];
}

/** Internal-only shape — includes answerKey. Never returned from any student/AI-reachable endpoint. */
export interface Question {
  id: string;
  topicId: string;
  type: QuestionType;
  difficulty: number;
  promptText: string;
  promptAssets: PromptAsset[];
  answerKey: AnswerKey;
  markScheme: MarkScheme | null;
  tags: string[];
  status: QuestionStatus;
  createdAt: Date;
}

/** answerKey stripped — the only shape exposed outward (DOMAIN_MODEL.md §2.6 business rule). */
export type PublicQuestion = Omit<Question, 'answerKey'>;
