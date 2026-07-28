import type {
  AnswerKey,
  ContentStatus,
  MarkScheme,
  PromptAsset,
  PublicQuestion,
  Question,
  QuestionType,
  Topic,
  TopicTier,
} from './curriculum.types';

export interface CreateTopicInput {
  name: string;
  examBoard: string;
  tier: TopicTier;
  gradeBand: number[];
}

export interface TopicFilter {
  examBoard?: string;
  tier?: TopicTier;
  gradeBand?: number;
  status?: ContentStatus;
}

/**
 * Owned by this module (ARCHITECTURE.md §21.2; DOMAIN_MODEL.md §2.5). The
 * prerequisite DAG's acyclicity is enforced in curriculum.service, which
 * reads via findById to walk the graph before calling addPrerequisiteLink —
 * MongoDB cannot express that constraint, so it is not attempted here.
 */
export interface TopicRepository {
  findById(id: string): Promise<Topic | null>;
  findMany(filter: TopicFilter): Promise<Topic[]>;
  create(input: CreateTopicInput): Promise<Topic>;
  addPrerequisiteLink(topicId: string, prerequisiteTopicId: string): Promise<void>;
  publish(id: string): Promise<void>;
}

export interface CreateQuestionInput {
  topicId: string;
  type: QuestionType;
  difficulty: number;
  promptText: string;
  promptAssets?: PromptAsset[];
  answerKey: AnswerKey;
  markScheme?: MarkScheme;
  tags?: string[];
}

export interface QuestionSelectionFilter {
  topicId: string;
  minDifficulty?: number;
  maxDifficulty?: number;
  limit?: number;
}

/** Repository interface as specified verbatim in DOMAIN_MODEL.md §2.6. */
export interface QuestionRepository {
  findById(id: string): Promise<Question | null>;
  findPublicById(id: string): Promise<PublicQuestion | null>;
  findForTopic(filter: QuestionSelectionFilter): Promise<PublicQuestion[]>;
  create(input: CreateQuestionInput): Promise<Question>;
  publish(id: string): Promise<void>;
  retire(id: string): Promise<void>;
}
