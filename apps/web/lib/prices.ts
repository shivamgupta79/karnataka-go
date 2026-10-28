/** Freshness tiers for a cached price row. */
export type PriceAge = "fresh" | "stale" | "old";

/** Age thresholds in milliseconds. */
export const MAX_AGE = {
  fresh: 2 * 60 * 60 * 1000,   // 2 hours
  stale: 24 * 60 * 60 * 1000,  // 24 hours
} as const;

/**
 * Returns a freshness tier based on how old the fetched_at timestamp is.
 * - 'fresh'  → within 2 hours
 * - 'stale'  → 2–24 hours old
 * - 'old'    → older than 24 hours
 */
export function priceAge(fetchedAt: string): PriceAge {
  const age = Date.now() - new Date(fetchedAt).getTime();
  if (age < MAX_AGE.fresh) return "fresh";
  if (age < MAX_AGE.stale) return "stale";
  return "old";
}

/**
 * Returns a human-readable "X ago" string for a fetched_at timestamp.
 * Examples: "just now", "5 minutes ago", "3 hours ago", "2 days ago".
 */
export function formatLastUpdated(fetchedAt: string): string {
  const ms = Date.now() - new Date(fetchedAt).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
