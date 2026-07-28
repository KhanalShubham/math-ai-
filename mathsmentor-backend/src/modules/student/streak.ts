export interface StreakState {
  currentStreakDays: number;
  longestStreakDays: number;
  lastActiveDate: Date | null;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whole calendar days between two dates (UTC, day-granularity) — negative if `b` is before `a`. */
function daysBetween(a: Date, b: Date): number {
  const aMidnight = new Date(`${dayKey(a)}T00:00:00.000Z`).getTime();
  const bMidnight = new Date(`${dayKey(b)}T00:00:00.000Z`).getTime();
  return Math.round((bMidnight - aMidnight) / (24 * 60 * 60 * 1000));
}

/**
 * Pure streak-update computation — kept out of the Mongo repository (unlike
 * mastery's recency-weighted scoring, which lives inline in its repo) so the
 * day-boundary arithmetic is directly unit-testable without a fake/real DB.
 *
 * Same calendar day as the last recorded activity: no change (a student
 * doing five practice items in one sitting doesn't get credit for a
 * five-day streak). A gap of more than one day — or activity dated before
 * the last recorded day, which shouldn't happen in practice but is handled
 * the same way — resets the streak to 1 rather than erroring.
 */
export function computeStreakUpdate(previous: StreakState, activityDate: Date): StreakState {
  let currentStreakDays: number;

  if (!previous.lastActiveDate) {
    currentStreakDays = 1;
  } else {
    const diff = daysBetween(previous.lastActiveDate, activityDate);
    if (diff === 0) {
      currentStreakDays = previous.currentStreakDays;
    } else if (diff === 1) {
      currentStreakDays = previous.currentStreakDays + 1;
    } else {
      currentStreakDays = 1;
    }
  }

  return {
    currentStreakDays,
    longestStreakDays: Math.max(previous.longestStreakDays, currentStreakDays),
    lastActiveDate: activityDate,
  };
}
