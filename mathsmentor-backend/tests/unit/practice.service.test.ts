import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import { createPracticeService } from '../../src/modules/practice/practice.service';
import { PRACTICE_EVENTS } from '../../src/modules/practice/practice.events';
import type {
  CreatePracticeSessionInput,
  PracticeRepository,
} from '../../src/modules/practice/practice.repository.interface';
import type { PracticeItem, PracticeSession } from '../../src/modules/practice/practice.types';
import type {
  CreateQuestionInput,
  QuestionRepository,
  QuestionSelectionFilter,
} from '../../src/modules/curriculum/curriculum.repository.interface';
import type { PublicQuestion, Question } from '../../src/modules/curriculum/curriculum.types';

function fakeId(): string {
  return randomBytes(12).toString('hex');
}

class FakePracticeRepository implements PracticeRepository {
  private readonly sessions = new Map<string, PracticeSession>();

  async findById(id: string): Promise<PracticeSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async findInProgressForStudent(studentId: string): Promise<PracticeSession | null> {
    return (
      [...this.sessions.values()].find((s) => s.studentId === studentId && !s.completedAt) ?? null
    );
  }

  async findByStudent(studentId: string): Promise<PracticeSession[]> {
    return [...this.sessions.values()]
      .filter((s) => s.studentId === studentId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  async create(input: CreatePracticeSessionInput): Promise<PracticeSession> {
    const session: PracticeSession = {
      id: fakeId(),
      studentId: input.studentId,
      source: input.source,
      assignedByTeacherId: input.assignedByTeacherId ?? null,
      topicIds: input.topicIds,
      items: [],
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async appendItem(sessionId: string, item: PracticeItem): Promise<PracticeSession> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('not found');
    session.items.push(item);
    return session;
  }

  async complete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) session.completedAt = new Date();
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
      .filter((q) => q.topicId === filter.topicId)
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
    /* not needed for practice tests */
  }

  async retire(): Promise<void> {
    /* not needed for practice tests */
  }
}

function buildService() {
  const practiceRepository = new FakePracticeRepository();
  const questionRepository = new FakeQuestionRepository();
  const eventBus = new InProcessEventBus();
  const service = createPracticeService({ practiceRepository, questionRepository, eventBus });
  return { service, practiceRepository, questionRepository, eventBus };
}

describe('practice.service', () => {
  it('starts a self-selected session', async () => {
    const { service } = buildService();
    const topicId = fakeId();

    const session = await service.startSession(fakeId(), 'self_selected', [topicId]);

    expect(session.source).toBe('self_selected');
    expect(session.assignedByTeacherId).toBeNull();
    expect(session.completedAt).toBeNull();
  });

  it('rejects starting a session with no topics', async () => {
    const { service } = buildService();
    await expect(service.startSession(fakeId(), 'self_selected', [])).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects a teacher_assigned session with no assignedByTeacherId', async () => {
    const { service } = buildService();
    await expect(
      service.startSession(fakeId(), 'teacher_assigned', [fakeId()]),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects a self_selected session that sets assignedByTeacherId', async () => {
    const { service } = buildService();
    await expect(
      service.startSession(fakeId(), 'self_selected', [fakeId()], fakeId()),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('accepts a teacher_assigned session when assignedByTeacherId is provided', async () => {
    const { service } = buildService();
    const teacherId = fakeId();
    const session = await service.startSession(fakeId(), 'teacher_assigned', [fakeId()], teacherId);
    expect(session.assignedByTeacherId).toBe(teacherId);
  });

  it('allows starting a second session while one is already in progress (unlike Diagnostic)', async () => {
    const { service } = buildService();
    const studentId = fakeId();
    await service.startSession(studentId, 'self_selected', [fakeId()]);

    await expect(service.startSession(studentId, 'self_selected', [fakeId()])).resolves.toBeDefined();
  });

  it('grades an answer, appends the item, and publishes PracticeItemSubmitted', async () => {
    const { service, questionRepository, eventBus } = buildService();
    const topicId = fakeId();
    const question = await questionRepository.create({
      topicId,
      type: 'mcq',
      difficulty: 3,
      promptText: 'Pick one',
      answerKey: { correctOptionId: 'b' },
    });
    const studentId = fakeId();
    const session = await service.startSession(studentId, 'self_selected', [topicId]);

    const events: unknown[] = [];
    eventBus.subscribe(PRACTICE_EVENTS.PracticeItemSubmitted, async (e) => {
      events.push(e.payload);
    });

    const result = await service.submitItem(session.id, studentId, {
      questionId: question.id,
      studentAnswer: 'b',
      timeTakenMs: 500,
      hintsUsedCount: 1,
    });

    expect(result.isCorrect).toBe(true);
    expect(result.session.items).toHaveLength(1);
    expect(events).toEqual([
      { studentId, topicId, questionId: question.id, isCorrect: true },
    ]);
  });

  it('rejects submitting a question that does not belong to any topic in the session', async () => {
    const { service, questionRepository } = buildService();
    const sessionTopicId = fakeId();
    const otherTopicId = fakeId();
    const question = await questionRepository.create({
      topicId: otherTopicId,
      type: 'mcq',
      difficulty: 3,
      promptText: 'Pick one',
      answerKey: { correctOptionId: 'b' },
    });
    const studentId = fakeId();
    const session = await service.startSession(studentId, 'self_selected', [sessionTopicId]);

    await expect(
      service.submitItem(session.id, studentId, {
        questionId: question.id,
        studentAnswer: 'b',
        timeTakenMs: 500,
        hintsUsedCount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects submitting to a completed session', async () => {
    const { service, questionRepository } = buildService();
    const topicId = fakeId();
    const question = await questionRepository.create({
      topicId,
      type: 'mcq',
      difficulty: 3,
      promptText: 'Pick one',
      answerKey: { correctOptionId: 'b' },
    });
    const studentId = fakeId();
    const session = await service.startSession(studentId, 'self_selected', [topicId]);
    await service.completeSession(session.id, studentId);

    await expect(
      service.submitItem(session.id, studentId, {
        questionId: question.id,
        studentAnswer: 'b',
        timeTakenMs: 500,
        hintsUsedCount: 0,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects submitting for a session owned by another student', async () => {
    const { service } = buildService();
    const session = await service.startSession(fakeId(), 'self_selected', [fakeId()]);

    await expect(
      service.submitItem(session.id, fakeId(), {
        questionId: fakeId(),
        studentAnswer: 'x',
        timeTakenMs: 100,
        hintsUsedCount: 0,
      }),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_ERROR' });
  });

  it('completes a session with zero items (early abandon is allowed)', async () => {
    const { service } = buildService();
    const studentId = fakeId();
    const session = await service.startSession(studentId, 'self_selected', [fakeId()]);

    const completed = await service.completeSession(session.id, studentId);
    expect(completed.completedAt).not.toBeNull();
  });

  it('rejects completing an already-completed session', async () => {
    const { service } = buildService();
    const studentId = fakeId();
    const session = await service.startSession(studentId, 'self_selected', [fakeId()]);
    await service.completeSession(session.id, studentId);

    await expect(service.completeSession(session.id, studentId)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects fetching a session that does not exist', async () => {
    const { service } = buildService();
    await expect(service.getSession(fakeId(), fakeId())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
