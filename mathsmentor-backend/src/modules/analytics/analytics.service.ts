import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import {
  AUTH_EVENTS,
  type PasswordResetRequestedPayload,
  type UserRegisteredPayload,
} from '../auth/auth.events';
import {
  CURRICULUM_EVENTS,
  type QuestionPublishedPayload,
  type QuestionRetiredPayload,
  type TopicPublishedPayload,
} from '../curriculum/curriculum.events';
import { DIAGNOSTIC_EVENTS, type DiagnosticCompletedPayload } from '../diagnostic/diagnostic.events';
import { PARENT_EVENTS, type StudentLinkedPayload, type StudentUnlinkedPayload } from '../parent/parent.events';
import { PRACTICE_EVENTS, type PracticeItemSubmittedPayload } from '../practice/practice.events';
import {
  STUDENT_EVENTS,
  type StudentEnrolledPayload,
  type StudentGradeEstimateChangedPayload,
} from '../student/student.events';
import {
  TEACHER_EVENTS,
  type StudentEnrolledInClassPayload,
  type StudentWithdrawnFromClassPayload,
} from '../teacher/teacher.events';
import type { AnalyticsEventRepository } from './analytics.repository.interface';
import type { AnalyticsEvent, FindByStudentOptions } from './analytics.types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AnalyticsService {
  getStudentTimeline(studentId: string, options?: FindByStudentOptions): Promise<AnalyticsEvent[]>;
  getEventTypeCount(eventType: string, sinceDays?: number): Promise<number>;
}

export interface AnalyticsServiceDeps {
  analyticsEventRepository: AnalyticsEventRepository;
  eventBus: EventBus;
}

/**
 * DOMAIN_MODEL.md §2.13 describes this as a dedicated `analytics.onAnyEvent`
 * subscriber that writes on behalf of every module. The in-process EventBus
 * (AD-006) has no wildcard subscription — its interface is frozen — so the
 * closest safe approximation is subscribing individually to every event type
 * every other module currently publishes, exactly like mastery.service
 * already does for its two events. This is documented tech debt: a new event
 * type added by any module is silently absent from analytics until this file
 * is updated to subscribe to it too.
 */
export function createAnalyticsService(deps: AnalyticsServiceDeps): AnalyticsService {
  function record(
    eventType: string,
    aggregateType: string,
    aggregateId: string,
    studentId: string | null,
    payload: Record<string, unknown>,
    occurredAt: Date,
  ): Promise<AnalyticsEvent> {
    return deps.analyticsEventRepository.record({
      eventType,
      aggregateType,
      aggregateId,
      studentId,
      payload,
      occurredAt,
    });
  }

  deps.eventBus.subscribe<UserRegisteredPayload>(AUTH_EVENTS.UserRegistered, async (event) => {
    await record(
      event.type,
      'User',
      event.payload.userId,
      null,
      { email: event.payload.email },
      event.occurredAt,
    );
  });

  deps.eventBus.subscribe<{ userId: string }>(AUTH_EVENTS.UserLoggedIn, async (event) => {
    await record(event.type, 'User', event.payload.userId, null, {}, event.occurredAt);
  });

  // rawToken is a secret (it authenticates a password reset) — it must never
  // be persisted into this durable, queryable audit log, unlike the rest of
  // the payload the auth module publishes.
  deps.eventBus.subscribe<PasswordResetRequestedPayload>(
    AUTH_EVENTS.PasswordResetRequested,
    async (event) => {
      await record(
        event.type,
        'User',
        event.payload.userId,
        null,
        { email: event.payload.email },
        event.occurredAt,
      );
    },
  );

  deps.eventBus.subscribe<{ userId: string }>(AUTH_EVENTS.PasswordChanged, async (event) => {
    await record(event.type, 'User', event.payload.userId, null, {}, event.occurredAt);
  });

  deps.eventBus.subscribe<TopicPublishedPayload>(CURRICULUM_EVENTS.TopicPublished, async (event) => {
    await record(event.type, 'Topic', event.payload.topicId, null, {}, event.occurredAt);
  });

  deps.eventBus.subscribe<QuestionPublishedPayload>(
    CURRICULUM_EVENTS.QuestionPublished,
    async (event) => {
      await record(
        event.type,
        'Question',
        event.payload.questionId,
        null,
        { topicId: event.payload.topicId },
        event.occurredAt,
      );
    },
  );

  deps.eventBus.subscribe<QuestionRetiredPayload>(
    CURRICULUM_EVENTS.QuestionRetired,
    async (event) => {
      await record(event.type, 'Question', event.payload.questionId, null, {}, event.occurredAt);
    },
  );

  // Neither event below carries the attempt/item's own id (see each module's
  // *.events.ts) — the best available aggregateId is the student, documented
  // limitation rather than an invented id.
  deps.eventBus.subscribe<DiagnosticCompletedPayload>(
    DIAGNOSTIC_EVENTS.DiagnosticCompleted,
    async (event) => {
      await record(
        event.type,
        'DiagnosticAttempt',
        event.payload.studentId,
        event.payload.studentId,
        { finalGradeEstimate: event.payload.finalGradeEstimate, topicBreakdown: event.payload.topicBreakdown },
        event.occurredAt,
      );
    },
  );

  deps.eventBus.subscribe<PracticeItemSubmittedPayload>(
    PRACTICE_EVENTS.PracticeItemSubmitted,
    async (event) => {
      await record(
        event.type,
        'Question',
        event.payload.questionId,
        event.payload.studentId,
        { topicId: event.payload.topicId, isCorrect: event.payload.isCorrect },
        event.occurredAt,
      );
    },
  );

  deps.eventBus.subscribe<StudentEnrolledInClassPayload>(
    TEACHER_EVENTS.StudentEnrolledInClass,
    async (event) => {
      await record(
        event.type,
        'ClassGroup',
        event.payload.classId,
        event.payload.studentId,
        {},
        event.occurredAt,
      );
    },
  );

  deps.eventBus.subscribe<StudentWithdrawnFromClassPayload>(
    TEACHER_EVENTS.StudentWithdrawnFromClass,
    async (event) => {
      await record(
        event.type,
        'ClassGroup',
        event.payload.classId,
        event.payload.studentId,
        {},
        event.occurredAt,
      );
    },
  );

  deps.eventBus.subscribe<StudentLinkedPayload>(PARENT_EVENTS.StudentLinked, async (event) => {
    await record(
      event.type,
      'ParentProfile',
      event.payload.parentId,
      event.payload.studentId,
      {},
      event.occurredAt,
    );
  });

  deps.eventBus.subscribe<StudentUnlinkedPayload>(PARENT_EVENTS.StudentUnlinked, async (event) => {
    await record(
      event.type,
      'ParentProfile',
      event.payload.parentId,
      event.payload.studentId,
      {},
      event.occurredAt,
    );
  });

  deps.eventBus.subscribe<StudentEnrolledPayload>(STUDENT_EVENTS.StudentEnrolled, async (event) => {
    await record(
      event.type,
      'StudentProfile',
      event.payload.studentId,
      event.payload.studentId,
      { userId: event.payload.userId },
      event.occurredAt,
    );
  });

  deps.eventBus.subscribe<StudentGradeEstimateChangedPayload>(
    STUDENT_EVENTS.StudentGradeEstimateChanged,
    async (event) => {
      await record(
        event.type,
        'StudentProfile',
        event.payload.studentId,
        event.payload.studentId,
        { grade: event.payload.grade },
        event.occurredAt,
      );
    },
  );

  return {
    async getStudentTimeline(studentId, options) {
      return deps.analyticsEventRepository.findByStudent(studentId, options);
    },

    async getEventTypeCount(eventType, sinceDays) {
      const since = sinceDays !== undefined ? new Date(Date.now() - sinceDays * MS_PER_DAY) : undefined;
      return deps.analyticsEventRepository.countByEventType(eventType, since);
    },
  };
}
