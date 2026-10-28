import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when both env vars are present and look valid. */
export const supabaseConfigured =
  url.startsWith("https://") && key.length > 10;

/**
 * Returns a Supabase browser client, or null when env vars are not set.
 * Always check `supabaseConfigured` (or null-check the result) before use.
 */
export function createClient() {
  if (!supabaseConfigured) return null;
  return createBrowserClient(url, key);
}
