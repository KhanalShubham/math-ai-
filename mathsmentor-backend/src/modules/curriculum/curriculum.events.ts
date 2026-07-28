export const CURRICULUM_EVENTS = {
  TopicPublished: 'curriculum.TopicPublished',
  QuestionPublished: 'curriculum.QuestionPublished',
  QuestionRetired: 'curriculum.QuestionRetired',
} as const;

export interface TopicPublishedPayload {
  topicId: string;
}

export interface QuestionPublishedPayload {
  questionId: string;
  topicId: string;
}

export interface QuestionRetiredPayload {
  questionId: string;
}
