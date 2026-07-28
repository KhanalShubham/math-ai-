import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import { createDiagnosticService } from '../../src/modules/diagnostic/diagnostic.service';
import { DIAGNOSTIC_EVENTS } from '../../src/modules/diagnostic/diagnostic.events';
import type {
  AppendDiagnosticItemInput,
  DiagnosticRepository,
} from '../../src/modules/diagnostic/diagnostic.repository.interface';
import type { DiagnosticAttempt } from '../../src/modules/diagnostic/diagnostic.types';
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

class FakeDiagnosticRepository implements DiagnosticRepository {
  private readonly attempts = new Map<string, DiagnosticAttempt>();

  async findById(id: string): Promise<DiagnosticAttempt | null> {
    return this.attempts.get(id) ?? null;
  }

  async findInProgressForStudent(studentId: string): Promise<DiagnosticAttempt | null> {
    return (
      [...this.attempts.values()].find(
        (a) => a.studentId === studentId && a.status === 'in_progress',
      ) ?? null
    );
  }

  async findByStudent(studentId: string): Promise<DiagnosticAttempt[]> {
    return [...this.attempts.values()]
      .filter((a) => a.studentId === studentId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async create(studentId: string): Promise<DiagnosticAttempt> {
    const attempt: DiagnosticAttempt = {
      id: fakeId(),
      studentId,
      status: 'in_progress',
      startedAt: new Date(),
      completedAt: null,
      abilityEstimateHistory: [],
      items: [],
      finalGradeEstimate: null,
      topicBreakdown: [],
      createdAt: new Date(),
    };
    this.attempts.set(attempt.id, attempt);
    return attempt;
  }

  async appendItem(
    attemptId: string,
    item: AppendDiagnosticItemInput,
  ): Promise<DiagnosticAttempt> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) throw new Error('not found');
    const { theta, ...diagnosticItem } = item;
    attempt.items.push(diagnosticItem);
    attempt.abilityEstimateHistory.push({ afterItem: attempt.items.length, theta });
    return attempt;
  }

  async complete(
    attemptId: string,
    finalGradeEstimate: number,
    topicBreakdown: DiagnosticAttempt['topicBreakdown'],
  ): Promise<void> {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) return;
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    attempt.finalGradeEstimate = finalGradeEstimate;
    attempt.topicBreakdown = topicBreakdown;
  }
}

class FakeTopicRepository implements TopicRepository {
  private readonly topics = new Map<string, Topic>();

  async findById(id: string): Promise<Topic | null> {
    return this.topics.get(id) ?? null;
  }

  async findMany(filter: TopicFilter): Promise<Topic[]> {
    return [...this.topics.values()].filter((t) => {
      if (filter.examBoard && t.examBoard !== filter.examBoard) return false;
      if (filter.status && t.status !== filter.status) return false;
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
      status: 'published',
      createdAt: new Date(),
    };
    this.topics.set(topic.id, topic);
    return topic;
  }

  async addPrerequisiteLink(): Promise<void> {
    /* not needed for diagnostic tests */
  }

  async publish(): Promise<void> {
    /* not needed for diagnostic tests */
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
      status: 'published',
      createdAt: new Date(),
    };
    this.questions.set(question.id, question);
    return question;
  }

  async publish(): Promise<void> {
    /* not needed for diagnostic tests */
  }

  async retire(): Promise<void> {
    /* not needed for diagnostic tests */
  }
}

function buildService() {
  const diagnosticRepository = new FakeDiagnosticRepository();
  const topicRepository = new FakeTopicRepository();
  const questionRepository = new FakeQuestionRepository();
  const eventBus = new InProcessEventBus();
  const service = createDiagnosticService({
    diagnosticRepository,
    topicRepository,
    questionRepository,
    eventBus,
  });
  return { service, diagnosticRepository, topicRepository, questionRepository, eventBus };
}

async function seedTopicWithQuestionsAtEveryDifficulty(
  topicRepository: FakeTopicRepository,
  questionRepository: FakeQuestionRepository,
  examBoard = 'AQA',
) {
  const topic = await topicRepository.create({
    name: 'Fractions',
    examBoard,
    tier: 'foundation',
    gradeBand: [3, 4, 5],
  });
  const questionsByDifficulty = new Map<number, Question>();
  for (let difficulty = 1; difficulty <= 5; difficulty++) {
    const question = await questionRepository.create({
      topicId: topic.id,
      type: 'mcq',
      difficulty,
      promptText: `Question at difficulty ${difficulty}`,
      answerKey: { correctOptionId: 'correct' },
    });
    questionsByDifficulty.set(difficulty, question);
  }
  return { topic, questionsByDifficulty };
}

describe('diagnostic.service', () => {
  it('starts an attempt and selects a first question at the default difficulty', async () => {
    const { service, topicRepository, questionRepository } = buildService();
    await seedTopicWithQuestionsAtEveryDifficulty(topicRepository, questionRepository);

    const { attempt, nextQuestion } = await service.startAttempt(fakeId(), 'AQA', 'foundation');

    expect(attempt.status).toBe('in_progress');
    expect(attempt.items).toEqual([]);
    expect(nextQuestion?.difficulty).toBe(3);
  });

  it('rejects starting a second attempt while one is already in progress', async () => {
    const { service, topicRepository, questionRepository } = buildService();
    await seedTopicWithQuestionsAtEveryDifficulty(topicRepository, questionRepository);
    const studentId = fakeId();

    await service.startAttempt(studentId, 'AQA', 'foundation');

    await expect(service.startAttempt(studentId, 'AQA', 'foundation')).rejects.toMatchObject({
      code: 'CONFLICT',
    });
  });

  it('grades a correct answer, raises difficulty, and returns the next question', async () => {
    const { service, topicRepository, questionRepository } = buildService();
    const { questionsByDifficulty } = await seedTopicWithQuestionsAtEveryDifficulty(
      topicRepository,
      questionRepository,
    );
    const studentId = fakeId();
    const { attempt } = await service.startAttempt(studentId, 'AQA', 'foundation');
    const firstQuestion = questionsByDifficulty.get(3)!;

    const result = await service.submitItem(
      attempt.id,
      studentId,
      { questionId: firstQuestion.id, studentAnswer: 'correct', timeTakenMs: 1000, hintRequested: false },
      'AQA',
      'foundation',
    );

    expect(result.isCorrect).toBe(true);
    expect(result.attempt.items).toHaveLength(1);
    expect(result.attempt.abilityEstimateHistory).toEqual([{ afterItem: 1, theta: 0.5 }]);
    expect(result.nextQuestion?.difficulty).toBe(4); // stayed in-topic, difficulty went up after a correct answer
  });

  it('grades an incorrect answer and lowers difficulty for the next question', async () => {
    const { service, topicRepository, questionRepository } = buildService();
    const { questionsByDifficulty } = await seedTopicWithQuestionsAtEveryDifficulty(
      topicRepository,
      questionRepository,
    );
    const studentId = fakeId();
    const { attempt } = await service.startAttempt(studentId, 'AQA', 'foundation');
    const firstQuestion = questionsByDifficulty.get(3)!;

    const result = await service.submitItem(
      attempt.id,
      studentId,
      { questionId: firstQuestion.id, studentAnswer: 'wrong', timeTakenMs: 1000, hintRequested: false },
      'AQA',
      'foundation',
    );

    expect(result.isCorrect).toBe(false);
    expect(result.attempt.abilityEstimateHistory).toEqual([{ afterItem: 1, theta: -0.5 }]);
    expect(result.nextQuestion?.difficulty).toBe(2);
  });

  it('returns no next question once the per-topic item cap is reached, with only one topic available', async () => {
    const { service, topicRepository, questionRepository } = buildService();
    const { questionsByDifficulty } = await seedTopicWithQuestionsAtEveryDifficulty(
      topicRepository,
      questionRepository,
    );
    const studentId = fakeId();
    const { attempt, nextQuestion: q1 } = await service.startAttempt(studentId, 'AQA', 'foundation');

    const step1 = await service.submitItem(
      attempt.id,
      studentId,
      { questionId: q1!.id, studentAnswer: 'correct', timeTakenMs: 500, hintRequested: false },
      'AQA',
      'foundation',
    );
    expect(step1.nextQuestion).not.toBeNull();

    const step2 = await service.submitItem(
      attempt.id,
      studentId,
      {
        questionId: step1.nextQuestion!.id,
        studentAnswer: 'correct',
        timeTakenMs: 500,
        hintRequested: false,
      },
      'AQA',
      'foundation',
    );

    // ITEMS_PER_TOPIC (2) reached for the only eligible topic — nothing left to administer.
    expect(step2.nextQuestion).toBeNull();
    void questionsByDifficulty;
  });

  it('rejects submitting an item for an attempt owned by another student', async () => {
    const { service, topicRepository, questionRepository } = buildService();
    await seedTopicWithQuestionsAtEveryDifficulty(topicRepository, questionRepository);
    const { attempt } = await service.startAttempt(fakeId(), 'AQA', 'foundation');

    await expect(
      service.submitItem(
        attempt.id,
        fakeId(),
        { questionId: fakeId(), studentAnswer: 'x', timeTakenMs: 100, hintRequested: false },
        'AQA',
        'foundation',
      ),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  it('rejects submitting an item referencing a question that does not exist', async () => {
    const { service, topicRepository, questionRepository } = buildService();
    await seedTopicWithQuestionsAtEveryDifficulty(topicRepository, questionRepository);
    const studentId = fakeId();
    const { attempt } = await service.startAttempt(studentId, 'AQA', 'foundation');

    await expect(
      service.submitItem(
        attempt.id,
        studentId,
        { questionId: fakeId(), studentAnswer: 'x', timeTakenMs: 100, hintRequested: false },
        'AQA',
        'foundation',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects completing an attempt with no answered items', async () => {
    const { service, topicRepository, questionRepository } = buildService();
    await seedTopicWithQuestionsAtEveryDifficulty(topicRepository, questionRepository);
    const studentId = fakeId();
    const { attempt } = await service.startAttempt(studentId, 'AQA', 'foundation');

    await expect(service.completeAttempt(attempt.id, studentId)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('completes an attempt, computing a grade estimate and per-topic breakdown, and publishes DiagnosticCompleted', async () => {
    const { service, topicRepository, questionRepository, eventBus } = buildService();
    const { topic, questionsByDifficulty } = await seedTopicWithQuestionsAtEveryDifficulty(
      topicRepository,
      questionRepository,
    );
    const studentId = fakeId();
    const { attempt } = await service.startAttempt(studentId, 'AQA', 'foundation');

    await service.submitItem(
      attempt.id,
      studentId,
      {
        questionId: questionsByDifficulty.get(3)!.id,
        studentAnswer: 'correct',
        timeTakenMs: 500,
        hintRequested: false,
      },
      'AQA',
      'foundation',
    );

    const events: unknown[] = [];
    eventBus.subscribe(DIAGNOSTIC_EVENTS.DiagnosticCompleted, async (e) => {
      events.push(e.payload);
    });

    const completed = await service.completeAttempt(attempt.id, studentId);

    expect(completed.status).toBe('completed');
    expect(completed.completedAt).not.toBeNull();
    expect(completed.finalGradeEstimate).toBeGreaterThan(5); // theta was positive after one correct answer
    expect(completed.topicBreakdown).toEqual([{ topicId: topic.id, score: 1 }]);
    expect(events).toEqual([
      { studentId, finalGradeEstimate: completed.finalGradeEstimate, topicBreakdown: completed.topicBreakdown },
    ]);
  });

  it('rejects fetching an attempt that does not exist', async () => {
    const { service } = buildService();
    await expect(service.getAttempt(fakeId(), fakeId())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
