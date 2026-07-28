import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../errors';
import { evaluateAnswer } from '../../domain/grading/grading';
import type {
  QuestionRepository,
  TopicRepository,
} from '../curriculum/curriculum.repository.interface';
import type { PublicQuestion, TopicTier } from '../curriculum/curriculum.types';
import type { AppendDiagnosticItemInput, DiagnosticRepository } from './diagnostic.repository.interface';
import type { DiagnosticAttempt, TopicBreakdownEntry } from './diagnostic.types';
import { DIAGNOSTIC_EVENTS } from './diagnostic.events';

/** Bounded per DOMAIN_MODEL.md §2.7 ("a diagnostic is ~15-25 items, never unbounded"). */
const MAX_ITEMS = 20;
/** How many questions to administer per topic before moving to the next one. */
const ITEMS_PER_TOPIC = 2;
const START_DIFFICULTY = 3;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const THETA_STEP = 0.5;
const THETA_MIN = -3;
const THETA_MAX = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Placeholder ability→grade mapping — a linear map from theta's [-3, 3] range
 * onto GCSE grades [1, 9], NOT a real IRT/psychometric model. Documented as
 * a known simplification (PROGRESS.md tech debt), acceptable for a first
 * working diagnostic; replacing it never requires changing this module's
 * public contract, only this one function.
 */
function mapThetaToGrade(theta: number): number {
  const grade = 5 + theta * (4 / 3);
  return Math.round(clamp(grade, 1, 9));
}

export interface SubmitItemInput {
  questionId: string;
  studentAnswer: unknown;
  timeTakenMs: number;
  hintRequested: boolean;
}

export interface StartAttemptResult {
  attempt: DiagnosticAttempt;
  nextQuestion: PublicQuestion | null;
}

export interface SubmitItemResult {
  attempt: DiagnosticAttempt;
  isCorrect: boolean;
  nextQuestion: PublicQuestion | null;
}

export interface DiagnosticService {
  startAttempt(studentId: string, examBoard: string, tier: TopicTier): Promise<StartAttemptResult>;
  getCurrentAttempt(studentId: string): Promise<DiagnosticAttempt | null>;
  getAttempt(id: string, studentId: string): Promise<DiagnosticAttempt>;
  submitItem(
    attemptId: string,
    studentId: string,
    input: SubmitItemInput,
    examBoard: string,
    tier: TopicTier,
  ): Promise<SubmitItemResult>;
  completeAttempt(attemptId: string, studentId: string): Promise<DiagnosticAttempt>;
}

export interface DiagnosticServiceDeps {
  diagnosticRepository: DiagnosticRepository;
  topicRepository: TopicRepository;
  questionRepository: QuestionRepository;
  eventBus: EventBus;
}

function requireOwnAttempt(attempt: DiagnosticAttempt | null, studentId: string): DiagnosticAttempt {
  if (!attempt) {
    throw new NotFoundError('Diagnostic attempt not found');
  }
  if (attempt.studentId !== studentId) {
    throw new AuthorizationError('This diagnostic attempt does not belong to you');
  }
  return attempt;
}

/** Dedupes questionIds and fetches each Question once to resolve its topicId. */
async function resolveTopicIdsByQuestionId(
  deps: DiagnosticServiceDeps,
  questionIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(questionIds)];
  const questions = await Promise.all(uniqueIds.map((id) => deps.questionRepository.findById(id)));
  const map = new Map<string, string>();
  uniqueIds.forEach((id, i) => {
    const question = questions[i];
    if (question) map.set(id, question.topicId);
  });
  return map;
}

async function selectNextQuestion(
  deps: DiagnosticServiceDeps,
  attempt: DiagnosticAttempt,
  examBoard: string,
  tier: TopicTier,
): Promise<PublicQuestion | null> {
  if (attempt.items.length >= MAX_ITEMS) {
    return null;
  }

  const allTopics = await deps.topicRepository.findMany({ examBoard, status: 'published' });
  const eligibleTopics = allTopics.filter((t) => t.tier === tier || t.tier === 'both');
  if (eligibleTopics.length === 0) {
    return null;
  }

  const topicIdByQuestionId = await resolveTopicIdsByQuestionId(
    deps,
    attempt.items.map((item) => item.questionId),
  );
  const usedQuestionIds = new Set(attempt.items.map((item) => item.questionId));

  const countsByTopic = new Map<string, number>();
  for (const item of attempt.items) {
    const topicId = topicIdByQuestionId.get(item.questionId);
    if (topicId) countsByTopic.set(topicId, (countsByTopic.get(topicId) ?? 0) + 1);
  }

  const lastItem = attempt.items.at(-1);
  const lastTopicId = lastItem ? topicIdByQuestionId.get(lastItem.questionId) : undefined;

  for (const topic of eligibleTopics) {
    const answeredInTopic = countsByTopic.get(topic.id) ?? 0;
    if (answeredInTopic >= ITEMS_PER_TOPIC) {
      continue;
    }

    const difficulty =
      lastItem && lastTopicId === topic.id
        ? clamp(
            lastItem.presentedDifficulty + (lastItem.isCorrect ? 1 : -1),
            MIN_DIFFICULTY,
            MAX_DIFFICULTY,
          )
        : START_DIFFICULTY;

    const candidates = await deps.questionRepository.findForTopic({
      topicId: topic.id,
      minDifficulty: difficulty,
      maxDifficulty: difficulty,
      limit: 10,
    });
    const unused = candidates.find((q) => !usedQuestionIds.has(q.id));
    if (unused) {
      return unused;
    }
  }

  return null;
}

export function createDiagnosticService(deps: DiagnosticServiceDeps): DiagnosticService {
  return {
    async startAttempt(studentId, examBoard, tier) {
      const existing = await deps.diagnosticRepository.findInProgressForStudent(studentId);
      if (existing) {
        throw new ConflictError('A diagnostic attempt is already in progress for this student');
      }

      const attempt = await deps.diagnosticRepository.create(studentId);
      const nextQuestion = await selectNextQuestion(deps, attempt, examBoard, tier);
      return { attempt, nextQuestion };
    },

    async getCurrentAttempt(studentId) {
      return deps.diagnosticRepository.findInProgressForStudent(studentId);
    },

    async getAttempt(id, studentId) {
      const attempt = await deps.diagnosticRepository.findById(id);
      return requireOwnAttempt(attempt, studentId);
    },

    async submitItem(attemptId, studentId, input, examBoard, tier) {
      const attempt = requireOwnAttempt(await deps.diagnosticRepository.findById(attemptId), studentId);
      if (attempt.status !== 'in_progress') {
        throw new ValidationError('This diagnostic attempt is no longer in progress');
      }
      if (attempt.items.length >= MAX_ITEMS) {
        throw new ValidationError('Item limit reached — complete this diagnostic attempt');
      }

      const question = await deps.questionRepository.findById(input.questionId);
      if (!question) {
        throw new NotFoundError('Question not found');
      }

      const isCorrect = evaluateAnswer(question.type, question.answerKey, input.studentAnswer);
      const lastTheta = attempt.abilityEstimateHistory.at(-1)?.theta ?? 0;
      const theta = clamp(lastTheta + (isCorrect ? THETA_STEP : -THETA_STEP), THETA_MIN, THETA_MAX);

      const item: AppendDiagnosticItemInput = {
        questionId: input.questionId,
        presentedDifficulty: question.difficulty,
        studentAnswer: input.studentAnswer,
        isCorrect,
        timeTakenMs: input.timeTakenMs,
        hintRequested: input.hintRequested,
        theta,
      };
      const updated = await deps.diagnosticRepository.appendItem(attemptId, item);
      const nextQuestion = await selectNextQuestion(deps, updated, examBoard, tier);

      return { attempt: updated, isCorrect, nextQuestion };
    },

    async completeAttempt(attemptId, studentId) {
      const attempt = requireOwnAttempt(await deps.diagnosticRepository.findById(attemptId), studentId);
      if (attempt.status !== 'in_progress') {
        throw new ValidationError('This diagnostic attempt is no longer in progress');
      }
      if (attempt.items.length === 0) {
        throw new ValidationError('Cannot complete a diagnostic attempt with no answered items');
      }

      const theta = attempt.abilityEstimateHistory.at(-1)?.theta ?? 0;
      const finalGradeEstimate = mapThetaToGrade(theta);

      const topicIdByQuestionId = await resolveTopicIdsByQuestionId(
        deps,
        attempt.items.map((item) => item.questionId),
      );
      const correctByTopic = new Map<string, number>();
      const totalByTopic = new Map<string, number>();
      for (const item of attempt.items) {
        const topicId = topicIdByQuestionId.get(item.questionId);
        if (!topicId) continue;
        totalByTopic.set(topicId, (totalByTopic.get(topicId) ?? 0) + 1);
        if (item.isCorrect) correctByTopic.set(topicId, (correctByTopic.get(topicId) ?? 0) + 1);
      }
      const topicBreakdown: TopicBreakdownEntry[] = [...totalByTopic.entries()].map(
        ([topicId, total]) => ({
          topicId,
          score: (correctByTopic.get(topicId) ?? 0) / total,
        }),
      );

      await deps.diagnosticRepository.complete(attemptId, finalGradeEstimate, topicBreakdown);
      await deps.eventBus.publish(DIAGNOSTIC_EVENTS.DiagnosticCompleted, {
        studentId,
        finalGradeEstimate,
        topicBreakdown,
      });

      const completed = await deps.diagnosticRepository.findById(attemptId);
      return requireOwnAttempt(completed, studentId);
    },
  };
}
