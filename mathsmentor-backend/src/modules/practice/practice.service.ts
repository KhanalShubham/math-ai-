import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import { AuthorizationError, NotFoundError, ValidationError } from '../../errors';
import { evaluateAnswer } from '../../domain/grading/grading';
import type { QuestionRepository } from '../curriculum/curriculum.repository.interface';
import type { PracticeRepository } from './practice.repository.interface';
import type { PracticeItem, PracticeSession, PracticeSessionSource } from './practice.types';
import { PRACTICE_EVENTS } from './practice.events';

export interface SubmitPracticeItemInput {
  questionId: string;
  studentAnswer: unknown;
  timeTakenMs: number;
  hintsUsedCount: number;
}

export interface SubmitPracticeItemResult {
  session: PracticeSession;
  isCorrect: boolean;
}

export interface PracticeService {
  startSession(
    studentId: string,
    source: PracticeSessionSource,
    topicIds: string[],
    assignedByTeacherId?: string | null,
  ): Promise<PracticeSession>;
  getCurrentSession(studentId: string): Promise<PracticeSession | null>;
  getSession(id: string, studentId: string): Promise<PracticeSession>;
  submitItem(
    sessionId: string,
    studentId: string,
    input: SubmitPracticeItemInput,
  ): Promise<SubmitPracticeItemResult>;
  completeSession(sessionId: string, studentId: string): Promise<PracticeSession>;
}

export interface PracticeServiceDeps {
  practiceRepository: PracticeRepository;
  questionRepository: QuestionRepository;
  eventBus: EventBus;
}

function requireOwnSession(session: PracticeSession | null, studentId: string): PracticeSession {
  if (!session) {
    throw new NotFoundError('Practice session not found');
  }
  if (session.studentId !== studentId) {
    throw new AuthorizationError('This practice session does not belong to you');
  }
  return session;
}

export function createPracticeService(deps: PracticeServiceDeps): PracticeService {
  return {
    async startSession(studentId, source, topicIds, assignedByTeacherId = null) {
      if (topicIds.length === 0) {
        throw new ValidationError('A practice session must cover at least one topic');
      }
      const hasTeacher = assignedByTeacherId != null;
      if (source === 'teacher_assigned' && !hasTeacher) {
        throw new ValidationError('assignedByTeacherId is required when source is teacher_assigned');
      }
      if (source !== 'teacher_assigned' && hasTeacher) {
        throw new ValidationError('assignedByTeacherId may only be set when source is teacher_assigned');
      }

      // Unlike Diagnostic, practice sessions are casual and frequent — a
      // student may reasonably have several unfinished sessions across
      // different topics, so this does not reject on an existing in-progress
      // session (DOMAIN_MODEL.md §2.8 asks only for repository-shape parity
      // with DiagnosticRepository, not the same "one at a time" business rule).
      return deps.practiceRepository.create({
        studentId,
        source,
        topicIds,
        assignedByTeacherId,
      });
    },

    async getCurrentSession(studentId) {
      return deps.practiceRepository.findInProgressForStudent(studentId);
    },

    async getSession(id, studentId) {
      const session = await deps.practiceRepository.findById(id);
      return requireOwnSession(session, studentId);
    },

    async submitItem(sessionId, studentId, input) {
      const session = requireOwnSession(await deps.practiceRepository.findById(sessionId), studentId);
      if (session.completedAt) {
        throw new ValidationError('This practice session has already been completed');
      }

      const question = await deps.questionRepository.findById(input.questionId);
      if (!question) {
        throw new NotFoundError('Question not found');
      }
      if (!session.topicIds.includes(question.topicId)) {
        throw new ValidationError('This question does not belong to any topic in this session');
      }

      const isCorrect = evaluateAnswer(question.type, question.answerKey, input.studentAnswer);
      const item: PracticeItem = {
        questionId: input.questionId,
        studentAnswer: input.studentAnswer,
        isCorrect,
        timeTakenMs: input.timeTakenMs,
        hintsUsedCount: input.hintsUsedCount,
        submittedAt: new Date(),
      };

      const updated = await deps.practiceRepository.appendItem(sessionId, item);
      await deps.eventBus.publish(PRACTICE_EVENTS.PracticeItemSubmitted, {
        studentId,
        topicId: question.topicId,
        questionId: input.questionId,
        isCorrect,
      });

      return { session: updated, isCorrect };
    },

    async completeSession(sessionId, studentId) {
      const session = requireOwnSession(await deps.practiceRepository.findById(sessionId), studentId);
      if (session.completedAt) {
        throw new ValidationError('This practice session has already been completed');
      }

      await deps.practiceRepository.complete(sessionId);
      const completed = await deps.practiceRepository.findById(sessionId);
      return requireOwnSession(completed, studentId);
    },
  };
}
