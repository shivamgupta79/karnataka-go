/**
 * Runtime environment variable validation.
 *
 * Call validateServerEnv() at the top of any server-side module that needs
 * these variables — it throws with a clear message if anything is missing,
 * rather than letting you get a cryptic downstream error.
 *
 * Client-safe variables (NEXT_PUBLIC_*) are validated separately so we never
 * accidentally reference server-only keys in browser code.
 */

// ── Server-only variables (never sent to the browser) ────────────────────────
export type ServerEnv = {
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_SECRET: string;
};

export function getServerEnv(): ServerEnv {
  const missing: string[] = [];

  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const ADMIN_SECRET              = process.env.ADMIN_SECRET ?? "";

  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!ADMIN_SECRET)              missing.push("ADMIN_SECRET");

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required server environment variable(s): ${missing.join(", ")}. ` +
      `Copy .env.example to apps/web/.env.local and fill in the values.`
    );
  }

  return { SUPABASE_SERVICE_ROLE_KEY, ADMIN_SECRET };
}

// ── Client-safe variables ─────────────────────────────────────────────────────
export type PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

export function getPublicEnv(): PublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return {
    NEXT_PUBLIC_SUPABASE_URL:      url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
  };
}

// ── Safety check: these must NEVER appear as NEXT_PUBLIC_ variables ───────────
export function assertNoSecretLeak(): void {
  const forbidden = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_ADMIN_SECRET",
    "NEXT_PUBLIC_ANTHROPIC_API_KEY",
    "NEXT_PUBLIC_PORTKEY_API_KEY",
  ];
  for (const key of forbidden) {
    if (process.env[key]) {
      throw new Error(
        `[security] CRITICAL: "${key}" is set — this exposes a server secret to the browser. ` +
        `Remove it from your environment immediately.`
      );
    }
  }
}
