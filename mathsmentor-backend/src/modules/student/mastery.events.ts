export const MASTERY_EVENTS = {
  MasteryMilestoneReached: 'mastery.MasteryMilestoneReached',
} as const;

/**
 * Fired whenever a topic's masteryScore crosses MASTERY_MILESTONE_THRESHOLD
 * upward (mastery.service.ts) — compares only the immediately preceding
 * score to the new one, so a score that dips below the threshold and later
 * re-crosses it fires again. Documented simplification, not a true
 * once-ever achievement (that would need extra persisted state this module
 * doesn't have yet). Mastery's first published event (PROGRESS.md AD-014)
 * — every prior mastery.service change only ever subscribed.
 */
export interface MasteryMilestoneReachedPayload {
  studentId: string;
  topicId: string;
  masteryScore: number;
}
