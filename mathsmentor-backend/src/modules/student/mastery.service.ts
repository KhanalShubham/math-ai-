import type { EventBus } from '../../infrastructure/events/event-bus.interface';
import {
  DIAGNOSTIC_EVENTS,
  type DiagnosticCompletedPayload,
} from '../diagnostic/diagnostic.events';
import {
  PRACTICE_EVENTS,
  type PracticeItemSubmittedPayload,
} from '../practice/practice.events';
import type { MasteryRepository } from './mastery.repository.interface';
import type { MasteryRecord } from './mastery.types';

/** Diagnostic bootstrap has no per-item isCorrect, only a topic-level fraction — this is the threshold used to approximate one (documented simplification, see PROGRESS.md tech debt). */
const DIAGNOSTIC_BOOTSTRAP_PASS_THRESHOLD = 0.5;

export interface MasteryService {
  getByStudent(studentId: string): Promise<MasteryRecord[]>;
}

export interface MasteryServiceDeps {
  masteryRepository: MasteryRepository;
  eventBus: EventBus;
}

/**
 * masteryRepository.upsertFromAttempt is called ONLY from the two handlers
 * below, subscribed at construction time — no other exported method on this
 * service (or any other module) writes MasteryRecord (DOMAIN_MODEL.md §2.9
 * business rule).
 */
export function createMasteryService(deps: MasteryServiceDeps): MasteryService {
  deps.eventBus.subscribe<PracticeItemSubmittedPayload>(
    PRACTICE_EVENTS.PracticeItemSubmitted,
    async (event) => {
      const { studentId, topicId, isCorrect } = event.payload;
      await deps.masteryRepository.upsertFromAttempt(studentId, topicId, isCorrect, new Date());
    },
  );

  deps.eventBus.subscribe<DiagnosticCompletedPayload>(
    DIAGNOSTIC_EVENTS.DiagnosticCompleted,
    async (event) => {
      const { studentId, topicBreakdown } = event.payload;
      for (const { topicId, score } of topicBreakdown) {
        const isCorrect = score >= DIAGNOSTIC_BOOTSTRAP_PASS_THRESHOLD;
        await deps.masteryRepository.upsertFromAttempt(studentId, topicId, isCorrect, new Date());
      }
    },
  );

  return {
    async getByStudent(studentId) {
      return deps.masteryRepository.findByStudent(studentId);
    },
  };
}
