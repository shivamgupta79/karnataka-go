import { addDaysKey } from "./dates";

/**
 * Streak math shared by the Today view and the habit detail view.
 * Input is always a Set of completed day-keys ("YYYY-MM-DD") for one tracker.
 */

/**
 * Consecutive completed days *ending today*. If today is not completed the
 * current streak is 0 (per the PRD/task definition: "ending today").
 */
export function currentStreak(doneDates: Set<string>, today: string): number {
  let streak = 0;
  let cursor = today;
  while (doneDates.has(cursor)) {
    streak += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive completed days across all history. */
export function longestStreak(doneDates: Set<string>): number {
  if (doneDates.size === 0) return 0;
  const sorted = [...doneDates].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = addDaysKey(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  return longest;
}

/** Number of completed days within the given window. */
export function completedInWindow(doneDates: Set<string>, window: string[]): number {
  let count = 0;
  for (const day of window) if (doneDates.has(day)) count += 1;
  return count;
}
