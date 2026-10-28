import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Guard: SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed as a NEXT_PUBLIC_ var
if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "[security] NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is set — this leaks the service key " +
    "to the browser. Remove it from your .env.local immediately."
  );
}

export const serviceConfigured =
  url.startsWith("https://") && serviceKey.length > 10;

/**
 * Returns a Supabase client with the service role key (bypasses RLS).
 * Returns null when env vars are not set. NEVER expose to the browser.
 * Only call from server-side code (API routes, server components).
 */
export function createServiceClient() {
  if (!serviceConfigured) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
