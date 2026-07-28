import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import {
  createQuestionService,
  createTopicService,
} from '../../src/modules/curriculum/curriculum.service';
import { CURRICULUM_EVENTS } from '../../src/modules/curriculum/curriculum.events';
import type {
  CreateQuestionInput,
  CreateTopicInput,
  QuestionRepository,
  QuestionSelectionFilter,
  TopicFilter,
  TopicRepository,
} from '../../src/modules/curriculum/curriculum.repository.interface';
import type { PublicQuestion, Question, Topic } from '../../src/modules/curriculum/curriculum.types';

function fakeId(): string {
  return randomBytes(12).toString('hex');
}

class FakeTopicRepository implements TopicRepository {
  private readonly topics = new Map<string, Topic>();

  async findById(id: string): Promise<Topic | null> {
    return this.topics.get(id) ?? null;
  }

  async findMany(filter: TopicFilter): Promise<Topic[]> {
    return [...this.topics.values()].filter((t) => {
      if (filter.examBoard && t.examBoard !== filter.examBoard) return false;
      if (filter.tier && t.tier !== filter.tier) return false;
      if (filter.status && t.status !== filter.status) return false;
      if (filter.gradeBand !== undefined && !t.gradeBand.includes(filter.gradeBand)) return false;
      return true;
    });
  }

  async create(input: CreateTopicInput): Promise<Topic> {
    const topic: Topic = {
      id: fakeId(),
      name: input.name,
      examBoard: input.examBoard,
      tier: input.tier,
      gradeBand: input.gradeBand,
      prerequisiteTopicIds: [],
      status: 'draft',
      createdAt: new Date(),
    };
    this.topics.set(topic.id, topic);
    return topic;
  }

  async addPrerequisiteLink(topicId: string, prerequisiteTopicId: string): Promise<void> {
    const topic = this.topics.get(topicId);
    if (topic && !topic.prerequisiteTopicIds.includes(prerequisiteTopicId)) {
      topic.prerequisiteTopicIds.push(prerequisiteTopicId);
    }
  }

  async publish(id: string): Promise<void> {
    const topic = this.topics.get(id);
    if (topic) topic.status = 'published';
  }
}

class FakeQuestionRepository implements QuestionRepository {
  private readonly questions = new Map<string, Question>();

  async findById(id: string): Promise<Question | null> {
    return this.questions.get(id) ?? null;
  }

  async findPublicById(id: string): Promise<PublicQuestion | null> {
    const question = this.questions.get(id);
    if (!question) return null;
    const { answerKey: _answerKey, ...rest } = question;
    return rest;
  }

  async findForTopic(filter: QuestionSelectionFilter): Promise<PublicQuestion[]> {
    return [...this.questions.values()]
      .filter((q) => q.topicId === filter.topicId && q.status === 'published')
      .filter((q) => filter.minDifficulty === undefined || q.difficulty >= filter.minDifficulty)
      .filter((q) => filter.maxDifficulty === undefined || q.difficulty <= filter.maxDifficulty)
      .slice(0, filter.limit ?? 20)
      .map(({ answerKey: _answerKey, ...rest }) => rest);
  }

  async create(input: CreateQuestionInput): Promise<Question> {
    const question: Question = {
      id: fakeId(),
      topicId: input.topicId,
      type: input.type,
      difficulty: input.difficulty,
      promptText: input.promptText,
      promptAssets: input.promptAssets ?? [],
      answerKey: input.answerKey,
      markScheme: input.markScheme ?? null,
      tags: input.tags ?? [],
      status: 'draft',
      createdAt: new Date(),
    };
    this.questions.set(question.id, question);
    return question;
  }

  async publish(id: string): Promise<void> {
    const question = this.questions.get(id);
    if (question) question.status = 'published';
  }

  async retire(id: string): Promise<void> {
    const question = this.questions.get(id);
    if (question) question.status = 'retired';
  }
}

function buildTopicService() {
  const topicRepository = new FakeTopicRepository();
  const eventBus = new InProcessEventBus();
  const service = createTopicService({ topicRepository, eventBus });
  return { service, topicRepository, eventBus };
}

function buildQuestionService() {
  const topicRepository = new FakeTopicRepository();
  const questionRepository = new FakeQuestionRepository();
  const eventBus = new InProcessEventBus();
  const service = createQuestionService({ questionRepository, topicRepository, eventBus });
  return { service, topicRepository, questionRepository, eventBus };
}

const NEW_TOPIC_INPUT: CreateTopicInput = {
  name: 'Simplifying fractions',
  examBoard: 'AQA',
  tier: 'foundation',
  gradeBand: [3, 4, 5],
};

describe('curriculum.service — topics', () => {
  it('creates a topic in draft status', async () => {
    const { service } = buildTopicService();
    const topic = await service.createTopic(NEW_TOPIC_INPUT);
    expect(topic.status).toBe('draft');
    expect(topic.prerequisiteTopicIds).toEqual([]);
  });

  it('rejects fetching a topic that does not exist', async () => {
    const { service } = buildTopicService();
    await expect(service.getTopic(fakeId())).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('publishes a topic and emits TopicPublished', async () => {
    const { service, eventBus } = buildTopicService();
    const topic = await service.createTopic(NEW_TOPIC_INPUT);

    const events: string[] = [];
    eventBus.subscribe(CURRICULUM_EVENTS.TopicPublished, async () => {
      events.push(CURRICULUM_EVENTS.TopicPublished);
    });

    await service.publishTopic(topic.id);
    expect(events).toEqual([CURRICULUM_EVENTS.TopicPublished]);
  });

  it('adds a valid prerequisite link', async () => {
    const { service } = buildTopicService();
    const a = await service.createTopic(NEW_TOPIC_INPUT);
    const b = await service.createTopic({ ...NEW_TOPIC_INPUT, name: 'Adding fractions' });

    await service.addPrerequisite(b.id, a.id);

    const updated = await service.getTopic(b.id);
    expect(updated.prerequisiteTopicIds).toEqual([a.id]);
  });

  it('rejects a topic being its own prerequisite', async () => {
    const { service } = buildTopicService();
    const a = await service.createTopic(NEW_TOPIC_INPUT);

    await expect(service.addPrerequisite(a.id, a.id)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects a prerequisite link that would create a direct cycle', async () => {
    const { service } = buildTopicService();
    const a = await service.createTopic(NEW_TOPIC_INPUT);
    const b = await service.createTopic({ ...NEW_TOPIC_INPUT, name: 'Adding fractions' });

    await service.addPrerequisite(b.id, a.id); // b requires a

    await expect(service.addPrerequisite(a.id, b.id)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('rejects a prerequisite link that would create a transitive cycle', async () => {
    const { service } = buildTopicService();
    const a = await service.createTopic({ ...NEW_TOPIC_INPUT, name: 'A' });
    const b = await service.createTopic({ ...NEW_TOPIC_INPUT, name: 'B' });
    const c = await service.createTopic({ ...NEW_TOPIC_INPUT, name: 'C' });

    await service.addPrerequisite(b.id, a.id); // b requires a
    await service.addPrerequisite(c.id, b.id); // c requires b (=> c requires a transitively)

    // a requires c would close the loop a -> c -> b -> a
    await expect(service.addPrerequisite(a.id, c.id)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('rejects a prerequisite referencing a topic that does not exist', async () => {
    const { service } = buildTopicService();
    const a = await service.createTopic(NEW_TOPIC_INPUT);

    await expect(service.addPrerequisite(a.id, fakeId())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('curriculum.service — questions', () => {
  const NEW_QUESTION_INPUT_BASE = {
    type: 'numeric' as const,
    difficulty: 3,
    promptText: 'What is 1/2 + 1/4?',
    answerKey: { value: 0.75, tolerance: 0.001 },
  };

  it('rejects creating a question for a topic that does not exist', async () => {
    const { service } = buildQuestionService();
    await expect(
      service.createQuestion({ ...NEW_QUESTION_INPUT_BASE, topicId: fakeId() }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('creates a question in draft status', async () => {
    const { service, topicRepository } = buildQuestionService();
    const topic = await topicRepository.create(NEW_TOPIC_INPUT);

    const question = await service.createQuestion({
      ...NEW_QUESTION_INPUT_BASE,
      topicId: topic.id,
    });

    expect(question.status).toBe('draft');
    expect(question.answerKey).toEqual({ value: 0.75, tolerance: 0.001 });
  });

  it('never leaks answerKey through getPublicQuestion', async () => {
    const { service, topicRepository } = buildQuestionService();
    const topic = await topicRepository.create(NEW_TOPIC_INPUT);
    const question = await service.createQuestion({
      ...NEW_QUESTION_INPUT_BASE,
      topicId: topic.id,
    });

    const publicQuestion = await service.getPublicQuestion(question.id);

    expect(publicQuestion).not.toHaveProperty('answerKey');
  });

  it('never leaks answerKey through listForTopic', async () => {
    const { service, topicRepository } = buildQuestionService();
    const topic = await topicRepository.create(NEW_TOPIC_INPUT);
    const question = await service.createQuestion({
      ...NEW_QUESTION_INPUT_BASE,
      topicId: topic.id,
    });
    await service.publishQuestion(question.id);

    const questions = await service.listForTopic({ topicId: topic.id });

    expect(questions).toHaveLength(1);
    expect(questions[0]).not.toHaveProperty('answerKey');
  });

  it('excludes unpublished questions from listForTopic', async () => {
    const { service, topicRepository } = buildQuestionService();
    const topic = await topicRepository.create(NEW_TOPIC_INPUT);
    await service.createQuestion({ ...NEW_QUESTION_INPUT_BASE, topicId: topic.id });

    const questions = await service.listForTopic({ topicId: topic.id });
    expect(questions).toEqual([]);
  });

  it('publishes and retires a question, emitting the matching events', async () => {
    const { service, topicRepository, eventBus } = buildQuestionService();
    const topic = await topicRepository.create(NEW_TOPIC_INPUT);
    const question = await service.createQuestion({
      ...NEW_QUESTION_INPUT_BASE,
      topicId: topic.id,
    });

    const events: string[] = [];
    eventBus.subscribe(CURRICULUM_EVENTS.QuestionPublished, async () => {
      events.push(CURRICULUM_EVENTS.QuestionPublished);
    });
    eventBus.subscribe(CURRICULUM_EVENTS.QuestionRetired, async () => {
      events.push(CURRICULUM_EVENTS.QuestionRetired);
    });

    await service.publishQuestion(question.id);
    await service.retireQuestion(question.id);

    expect(events).toEqual([CURRICULUM_EVENTS.QuestionPublished, CURRICULUM_EVENTS.QuestionRetired]);
    const stored = await service.getQuestion(question.id);
    expect(stored.status).toBe('retired');
  });

  it('rejects fetching a question that does not exist', async () => {
    const { service } = buildQuestionService();
    await expect(service.getPublicQuestion(fakeId())).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
