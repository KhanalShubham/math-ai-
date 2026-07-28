import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import type {
  CreateQuestionInput,
  CreateTopicInput,
  QuestionRepository,
  QuestionSelectionFilter,
  TopicFilter,
  TopicRepository,
} from './curriculum.repository.interface';
import type { PublicQuestion, Question, Topic } from './curriculum.types';
import { CURRICULUM_EVENTS } from './curriculum.events';

export interface TopicService {
  createTopic(input: CreateTopicInput): Promise<Topic>;
  getTopic(id: string): Promise<Topic>;
  listTopics(filter: TopicFilter): Promise<Topic[]>;
  addPrerequisite(topicId: string, prerequisiteTopicId: string): Promise<void>;
  publishTopic(id: string): Promise<void>;
}

export interface TopicServiceDeps {
  topicRepository: TopicRepository;
  eventBus: EventBus;
}

/**
 * BFS over existing prerequisiteTopicIds edges starting at prerequisiteTopicId.
 * If topicId is reachable, prerequisiteTopicId already (transitively) depends
 * on topicId — adding "topicId depends on prerequisiteTopicId" would close a
 * cycle (DOMAIN_MODEL.md §2.5 business rule).
 */
async function wouldCreateCycle(
  topicRepository: TopicRepository,
  topicId: string,
  prerequisiteTopicId: string,
): Promise<boolean> {
  const visited = new Set([prerequisiteTopicId]);
  const queue = [prerequisiteTopicId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === topicId) {
      return true;
    }
    const topic = await topicRepository.findById(current);
    for (const next of topic?.prerequisiteTopicIds ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return false;
}

export function createTopicService(deps: TopicServiceDeps): TopicService {
  return {
    async createTopic(input) {
      return deps.topicRepository.create(input);
    },

    async getTopic(id) {
      const topic = await deps.topicRepository.findById(id);
      if (!topic) {
        throw new NotFoundError('Topic not found');
      }
      return topic;
    },

    async listTopics(filter) {
      return deps.topicRepository.findMany(filter);
    },

    async addPrerequisite(topicId, prerequisiteTopicId) {
      if (topicId === prerequisiteTopicId) {
        throw new ValidationError('A topic cannot be its own prerequisite');
      }
      const [topic, prerequisite] = await Promise.all([
        deps.topicRepository.findById(topicId),
        deps.topicRepository.findById(prerequisiteTopicId),
      ]);
      if (!topic || !prerequisite) {
        throw new NotFoundError('Topic not found');
      }
      if (await wouldCreateCycle(deps.topicRepository, topicId, prerequisiteTopicId)) {
        throw new ConflictError('Adding this prerequisite would create a cycle in the topic graph');
      }

      await deps.topicRepository.addPrerequisiteLink(topicId, prerequisiteTopicId);
    },

    async publishTopic(id) {
      const topic = await deps.topicRepository.findById(id);
      if (!topic) {
        throw new NotFoundError('Topic not found');
      }
      await deps.topicRepository.publish(id);
      await deps.eventBus.publish(CURRICULUM_EVENTS.TopicPublished, { topicId: id });
    },
  };
}

export interface QuestionService {
  createQuestion(input: CreateQuestionInput): Promise<Question>;
  getQuestion(id: string): Promise<Question>;
  getPublicQuestion(id: string): Promise<PublicQuestion>;
  listForTopic(filter: QuestionSelectionFilter): Promise<PublicQuestion[]>;
  publishQuestion(id: string): Promise<void>;
  retireQuestion(id: string): Promise<void>;
}

export interface QuestionServiceDeps {
  questionRepository: QuestionRepository;
  topicRepository: TopicRepository;
  eventBus: EventBus;
}

export function createQuestionService(deps: QuestionServiceDeps): QuestionService {
  return {
    async createQuestion(input) {
      const topic = await deps.topicRepository.findById(input.topicId);
      if (!topic) {
        throw new NotFoundError('Topic not found');
      }
      return deps.questionRepository.create(input);
    },

    async getQuestion(id) {
      const question = await deps.questionRepository.findById(id);
      if (!question) {
        throw new NotFoundError('Question not found');
      }
      return question;
    },

    async getPublicQuestion(id) {
      const question = await deps.questionRepository.findPublicById(id);
      if (!question) {
        throw new NotFoundError('Question not found');
      }
      return question;
    },

    async listForTopic(filter) {
      return deps.questionRepository.findForTopic(filter);
    },

    async publishQuestion(id) {
      const question = await deps.questionRepository.findById(id);
      if (!question) {
        throw new NotFoundError('Question not found');
      }
      await deps.questionRepository.publish(id);
      await deps.eventBus.publish(CURRICULUM_EVENTS.QuestionPublished, {
        questionId: id,
        topicId: question.topicId,
      });
    },

    async retireQuestion(id) {
      const question = await deps.questionRepository.findById(id);
      if (!question) {
        throw new NotFoundError('Question not found');
      }
      await deps.questionRepository.retire(id);
      await deps.eventBus.publish(CURRICULUM_EVENTS.QuestionRetired, { questionId: id });
    },
  };
}
