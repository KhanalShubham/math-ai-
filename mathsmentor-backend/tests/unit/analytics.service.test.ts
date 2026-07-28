import { randomBytes } from 'node:crypto';
import { InProcessEventBus } from '../../src/infrastructure/events/in-process.event-bus';
import { createAnalyticsService } from '../../src/modules/analytics/analytics.service';
import { AUTH_EVENTS } from '../../src/modules/auth/auth.events';
import { CURRICULUM_EVENTS } from '../../src/modules/curriculum/curriculum.events';
import { DIAGNOSTIC_EVENTS } from '../../src/modules/diagnostic/diagnostic.events';
import { PARENT_EVENTS } from '../../src/modules/parent/parent.events';
import { PRACTICE_EVENTS } from '../../src/modules/practice/practice.events';
import { STUDENT_EVENTS } from '../../src/modules/student/student.events';
import { TEACHER_EVENTS } from '../../src/modules/teacher/teacher.events';
import type { AnalyticsEventRepository } from '../../src/modules/analytics/analytics.repository.interface';
import type {
  AnalyticsEvent,
  FindByStudentOptions,
  NewAnalyticsEvent,
} from '../../src/modules/analytics/analytics.types';

function fakeId(): string {
  return randomBytes(12).toString('hex');
}

class FakeAnalyticsEventRepository implements AnalyticsEventRepository {
  readonly events: AnalyticsEvent[] = [];

  async record(event: NewAnalyticsEvent): Promise<AnalyticsEvent> {
    const stored: AnalyticsEvent = { id: fakeId(), ...event };
    this.events.push(stored);
    return stored;
  }

  async findByStudent(studentId: string, options?: FindByStudentOptions): Promise<AnalyticsEvent[]> {
    let matches = this.events.filter((e) => e.studentId === studentId);
    if (options?.eventType) matches = matches.filter((e) => e.eventType === options.eventType);
    matches = [...matches].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    return options?.limit ? matches.slice(0, options.limit) : matches;
  }

  async countByEventType(eventType: string, since?: Date): Promise<number> {
    return this.events.filter(
      (e) => e.eventType === eventType && (!since || e.occurredAt >= since),
    ).length;
  }
}

function buildService() {
  const analyticsEventRepository = new FakeAnalyticsEventRepository();
  const eventBus = new InProcessEventBus();
  const service = createAnalyticsService({ analyticsEventRepository, eventBus });
  return { service, analyticsEventRepository, eventBus };
}

describe('analytics.service', () => {
  it('projects auth.UserRegistered into an AnalyticsEvent scoped to the User aggregate', async () => {
    const { service, eventBus } = buildService();
    const userId = fakeId();

    await eventBus.publish(AUTH_EVENTS.UserRegistered, { userId, email: 'ada@example.com' });

    const events = await service.getStudentTimeline(userId);
    // Not student-scoped (studentId is null for auth events) — assert via count instead.
    expect(events).toEqual([]);
    await expect(service.getEventTypeCount(AUTH_EVENTS.UserRegistered)).resolves.toBe(1);
  });

  it('never persists the raw password-reset token into the analytics log', async () => {
    const { analyticsEventRepository, eventBus } = buildService();
    const userId = fakeId();

    await eventBus.publish(AUTH_EVENTS.PasswordResetRequested, {
      userId,
      email: 'ada@example.com',
      rawToken: 'super-secret-raw-token',
    });

    expect(analyticsEventRepository.events).toHaveLength(1);
    const stored = analyticsEventRepository.events[0]!;
    expect(stored.payload).toEqual({ email: 'ada@example.com' });
    expect(JSON.stringify(stored.payload)).not.toContain('super-secret-raw-token');
  });

  it('records auth.UserLoggedIn and auth.PasswordChanged with the User aggregate and no payload', async () => {
    const { analyticsEventRepository, eventBus } = buildService();
    const userId = fakeId();

    await eventBus.publish(AUTH_EVENTS.UserLoggedIn, { userId });
    await eventBus.publish(AUTH_EVENTS.PasswordChanged, { userId });

    expect(analyticsEventRepository.events).toHaveLength(2);
    for (const event of analyticsEventRepository.events) {
      expect(event.aggregateType).toBe('User');
      expect(event.aggregateId).toBe(userId);
      expect(event.studentId).toBeNull();
      expect(event.payload).toEqual({});
    }
  });

  it('records curriculum events against the Topic/Question aggregates', async () => {
    const { analyticsEventRepository, eventBus } = buildService();
    const topicId = fakeId();
    const questionId = fakeId();

    await eventBus.publish(CURRICULUM_EVENTS.TopicPublished, { topicId });
    await eventBus.publish(CURRICULUM_EVENTS.QuestionPublished, { questionId, topicId });
    await eventBus.publish(CURRICULUM_EVENTS.QuestionRetired, { questionId });

    expect(analyticsEventRepository.events).toHaveLength(3);
    expect(analyticsEventRepository.events[0]).toMatchObject({
      eventType: CURRICULUM_EVENTS.TopicPublished,
      aggregateType: 'Topic',
      aggregateId: topicId,
    });
    expect(analyticsEventRepository.events[1]).toMatchObject({
      eventType: CURRICULUM_EVENTS.QuestionPublished,
      aggregateType: 'Question',
      aggregateId: questionId,
      payload: { topicId },
    });
    expect(analyticsEventRepository.events[2]).toMatchObject({
      eventType: CURRICULUM_EVENTS.QuestionRetired,
      aggregateType: 'Question',
      aggregateId: questionId,
    });
  });

  it('records a DiagnosticCompleted event scoped to the student, with the full topic breakdown', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();
    const topicBreakdown = [{ topicId: fakeId(), score: 0.8 }];

    await eventBus.publish(DIAGNOSTIC_EVENTS.DiagnosticCompleted, {
      studentId,
      finalGradeEstimate: 6,
      topicBreakdown,
    });

    const events = await service.getStudentTimeline(studentId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventType: DIAGNOSTIC_EVENTS.DiagnosticCompleted,
      aggregateType: 'DiagnosticAttempt',
      studentId,
      payload: { finalGradeEstimate: 6, topicBreakdown },
    });
  });

  it('records a PracticeItemSubmitted event scoped to both the student and the question', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();
    const topicId = fakeId();
    const questionId = fakeId();

    await eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
      studentId,
      topicId,
      questionId,
      isCorrect: true,
    });

    const events = await service.getStudentTimeline(studentId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      aggregateType: 'Question',
      aggregateId: questionId,
      studentId,
      payload: { topicId, isCorrect: true },
    });
  });

  it('records teacher class enrollment/withdrawal events scoped to the student', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();
    const classId = fakeId();

    await eventBus.publish(TEACHER_EVENTS.StudentEnrolledInClass, { studentId, classId });
    await eventBus.publish(TEACHER_EVENTS.StudentWithdrawnFromClass, { studentId, classId });

    const events = await service.getStudentTimeline(studentId);
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event.aggregateType).toBe('ClassGroup');
      expect(event.aggregateId).toBe(classId);
    }
  });

  it('records parent link/unlink events scoped to the student', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();
    const parentId = fakeId();

    await eventBus.publish(PARENT_EVENTS.StudentLinked, { parentId, studentId });
    await eventBus.publish(PARENT_EVENTS.StudentUnlinked, { parentId, studentId });

    const events = await service.getStudentTimeline(studentId);
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event.aggregateType).toBe('ParentProfile');
      expect(event.aggregateId).toBe(parentId);
    }
  });

  it('records student profile events scoped to the student', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();
    const userId = fakeId();

    await eventBus.publish(STUDENT_EVENTS.StudentEnrolled, { studentId, userId });
    await eventBus.publish(STUDENT_EVENTS.StudentGradeEstimateChanged, { studentId, grade: 7 });

    const events = await service.getStudentTimeline(studentId);
    expect(events).toHaveLength(2);
    expect(events.find((e) => e.eventType === STUDENT_EVENTS.StudentEnrolled)?.payload).toEqual({
      userId,
    });
    expect(
      events.find((e) => e.eventType === STUDENT_EVENTS.StudentGradeEstimateChanged)?.payload,
    ).toEqual({ grade: 7 });
  });

  it('filters a student timeline by eventType and limit', async () => {
    const { service, eventBus } = buildService();
    const studentId = fakeId();

    await eventBus.publish(STUDENT_EVENTS.StudentEnrolled, { studentId, userId: fakeId() });
    await eventBus.publish(STUDENT_EVENTS.StudentGradeEstimateChanged, { studentId, grade: 5 });
    await eventBus.publish(STUDENT_EVENTS.StudentGradeEstimateChanged, { studentId, grade: 6 });

    const filtered = await service.getStudentTimeline(studentId, {
      eventType: STUDENT_EVENTS.StudentGradeEstimateChanged,
    });
    expect(filtered).toHaveLength(2);

    const limited = await service.getStudentTimeline(studentId, { limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it('counts events by type within a recency window', async () => {
    const { analyticsEventRepository, service } = buildService();
    const now = new Date();
    analyticsEventRepository.events.push(
      {
        id: fakeId(),
        eventType: 'practice.PracticeItemSubmitted',
        aggregateType: 'Question',
        aggregateId: fakeId(),
        studentId: fakeId(),
        payload: {},
        occurredAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      },
      {
        id: fakeId(),
        eventType: 'practice.PracticeItemSubmitted',
        aggregateType: 'Question',
        aggregateId: fakeId(),
        studentId: fakeId(),
        payload: {},
        occurredAt: now,
      },
    );

    await expect(service.getEventTypeCount('practice.PracticeItemSubmitted')).resolves.toBe(2);
    await expect(
      service.getEventTypeCount('practice.PracticeItemSubmitted', 7),
    ).resolves.toBe(1);
  });
});
