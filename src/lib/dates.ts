/**
 * Local-date helpers. Everything is keyed by the user's *local* calendar day
 * (YYYY-MM-DD) so "today" matches what the user sees, per the PRD assumption.
 */

/** Local date -> "YYYY-MM-DD". Avoids the UTC shift of `toISOString()`. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** "YYYY-MM-DD" -> local Date at midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysKey(key: string, delta: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + delta);
  return toDateKey(date);
}

/** Inclusive list of the last `n` day-keys ending on `endKey` (default today). */
export function lastNDaysKeys(n: number, endKey: string = todayKey()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDaysKey(endKey, -i));
  return out;
}

export function formatWeekday(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, { weekday: "short" });
}

export function formatDayNumber(key: string): string {
  return String(parseDateKey(key).getDate());
}

export function formatLongDate(key: string = todayKey()): string {
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatMonthDay(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
