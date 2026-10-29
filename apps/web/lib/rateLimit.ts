/**
 * Lightweight in-process rate limiter for Next.js API routes.
 *
 * Since Next.js serverless functions can run across many instances,
 * this is a best-effort per-instance guard. For strict cross-instance
 * limiting, replace the Map with a Redis/Upstash store.
 *
 * Usage:
 *   const result = rateLimit(key, { windowMs, max });
 *   if (!result.ok) return NextResponse.json({ error: result.message }, { status: 429 });
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

/** Prune expired keys every 5 minutes to avoid memory leaks.
 *  .unref() lets the Node process exit cleanly even if this timer is pending —
 *  important for Render's graceful shutdown during deploys. */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.resetAt < now) store.delete(k);
  }
}, 5 * 60 * 1000).unref();

export interface RateLimitOptions {
  /** Rolling window duration in milliseconds */
  windowMs: number;
  /** Maximum hits allowed in the window */
  max: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  /** Human-readable reason when ok=false */
  message: string;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + opts.windowMs };
    store.set(key, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, opts.max - entry.count);

  if (entry.count > opts.max) {
    const waitSec = Math.ceil((entry.resetAt - now) / 1000);
    return {
      ok: false,
      remaining: 0,
      resetAt: entry.resetAt,
      message: `Too many requests. Try again in ${waitSec} second${waitSec !== 1 ? "s" : ""}.`,
    };
  }

  return { ok: true, remaining, resetAt: entry.resetAt, message: "" };
}

// ── OTP-specific logic ────────────────────────────────────────────────────────
//
// Rules (per user ID):
//   • Max 2 OTPs per 60-second window (1 phone + 1 email)
//   • Max 10 OTPs per 5-minute window
//   • If the 5-minute limit is exceeded → block the user for 7 minutes
//
// We track two separate windows and a block store per uid.

interface OtpEntry {
  minuteCount: number;  minuteReset: number;
  fiveMinCount: number; fiveMinReset: number;
}

const otpStore   = new Map<string, OtpEntry>();
const otpBlocked = new Map<string, number>(); // uid → unblock timestamp

const OTP_PER_MIN      = 2;
const OTP_PER_5MIN     = 10;
const BLOCK_DURATION   = 7 * 60 * 1000;   // 7 minutes
const ONE_MINUTE       = 60 * 1000;
const FIVE_MINUTES     = 5  * 60 * 1000;

export interface OtpLimitResult {
  ok: boolean;
  message: string;
  blockedUntil?: number;
}

export function checkOtpLimit(uid: string): OtpLimitResult {
  const now = Date.now();

  // Already blocked?
  const unblockAt = otpBlocked.get(uid);
  if (unblockAt && unblockAt > now) {
    const secs = Math.ceil((unblockAt - now) / 1000);
    return {
      ok: false,
      blockedUntil: unblockAt,
      message: `OTP sending blocked for ${Math.ceil(secs / 60)} min ${secs % 60} sec. Too many requests.`,
    };
  } else if (unblockAt) {
    otpBlocked.delete(uid);
  }

  let e = otpStore.get(uid);
  if (!e) {
    e = { minuteCount: 0, minuteReset: now + ONE_MINUTE,
          fiveMinCount: 0, fiveMinReset: now + FIVE_MINUTES };
    otpStore.set(uid, e);
  }

  // Reset per-minute window
  if (e.minuteReset < now) {
    e.minuteCount = 0;
    e.minuteReset = now + ONE_MINUTE;
  }
  // Reset per-5-minute window
  if (e.fiveMinReset < now) {
    e.fiveMinCount = 0;
    e.fiveMinReset = now + FIVE_MINUTES;
  }

  e.minuteCount  += 1;
  e.fiveMinCount += 1;

  // Exceeded 5-minute cap → block
  if (e.fiveMinCount > OTP_PER_5MIN) {
    otpBlocked.set(uid, now + BLOCK_DURATION);
    return {
      ok: false,
      blockedUntil: now + BLOCK_DURATION,
      message: "OTP limit exceeded. Sending blocked for 7 minutes.",
    };
  }

  // Exceeded per-minute cap
  if (e.minuteCount > OTP_PER_MIN) {
    const waitSec = Math.ceil((e.minuteReset - now) / 1000);
    return {
      ok: false,
      message: `Max ${OTP_PER_MIN} OTPs per minute. Try again in ${waitSec} second${waitSec !== 1 ? "s" : ""}.`,
    };
  }

  return { ok: true, message: "" };
}

/** Admin: remove OTP block for a uid */
export function unblockOtp(uid: string): void {
  otpBlocked.delete(uid);
  otpStore.delete(uid);
}

/** Admin: check if uid is OTP-blocked */
export function getOtpBlock(uid: string): { blocked: boolean; until?: number } {
  const until = otpBlocked.get(uid);
  if (until && until > Date.now()) return { blocked: true, until };
  return { blocked: false };
}
