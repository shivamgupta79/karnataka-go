"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

type AuthResult = { error: Error | null };

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured); // false immediately when not configured

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const supabase = createClient()!;

    // Get the current session on mount
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // Listen for sign-in / sign-out / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function signInWithGoogle(): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const supabase = createClient();
    if (!supabase) return { error: new Error("Supabase not configured") };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error("Sign-in failed") };
    }
  }

  async function signUpWithEmail(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<AuthResult> {
    const supabase = createClient();
    if (!supabase) return { error: new Error("Supabase not configured") };
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: displayName
            ? { display_name: displayName, full_name: displayName }
            : undefined,
        },
      });
      return { error: error ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error("Sign-up failed") };
    }
  }

  async function resetPassword(email: string): Promise<AuthResult> {
    const supabase = createClient();
    if (!supabase) return { error: new Error("Supabase not configured") };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      return { error: error ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error("Reset failed") };
    }
  }

  async function signOut(): Promise<void> {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut().catch(() => {/* ignore network errors on sign-out */});
  }

  return {
    user,
    loading,
    configured: supabaseConfigured,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
  };
}
