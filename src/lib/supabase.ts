import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Publishable configuration only — no secrets belong in client code.
 *
 * `VITE_SUPABASE_PUBLISHABLE_KEY` is the name documented in the PRD; the
 * platform also auto-populates `VITE_SUPABASE_ANON_KEY` (the same publishable /
 * anon key). We accept either so the client works in both setups. Neither value
 * is a secret — all row access is gated by Row Level Security in Postgres.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient = createClient(
  supabaseUrl as string,
  supabasePublishableKey as string,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Implicit flow lets sign-in work from the ephemeral preview panel.
      flowType: "implicit",
    },
  },
);
