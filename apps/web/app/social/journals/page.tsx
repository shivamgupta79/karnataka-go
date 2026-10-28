"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";

interface Journal {
  id: number;
  title: string | null;
  tips: string | null;
  steps: string | null;
  spent: number | null;
  user_id: string;
  trip_id: string;
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function JournalsPage() {
  const { user, loading, configured } = useAuth();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    fetch("/api/social/journals")
      .then((r) => r.json())
      .then((j) => { setJournals(j.journals ?? []); setFetching(false); })
      .catch(() => setFetching(false));
  }, [loading, user]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || fetching) {
    return (
      <div className="flex justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4"
          style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // ── Auth not configured ──────────────────────────────────────────────────
  if (!configured) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
        <p className="text-4xl">🔧</p>
        <h1 className="text-xl font-bold">Auth not configured</h1>
        <p className="text-sm opacity-60 leading-relaxed">
          Add Supabase credentials to{" "}
          <code className="font-mono bg-black/10 px-1 rounded">.env.local</code> to enable journals.
        </p>
        <Link href="/" className="text-sm underline opacity-50">← Back to planner</Link>
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold">Sign in to access journals</h1>
        <p className="text-sm opacity-60">Read and write travel journals with fellow travellers.</p>
        <Link
          href="/auth"
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}
        >
          Sign in or sign up →
        </Link>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/social" className="text-sm opacity-50 hover:opacity-75 transition-opacity">
            ← Social
          </Link>
          <h1 className="text-2xl font-extrabold mt-1" style={{ color: "var(--color-forest)" }}>
            📖 Trip Journals
          </h1>
        </div>
        <Link
          href="/social/journals/new"
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--color-saffron)" }}
        >
          ✍ Write Journal
        </Link>
      </div>

      {journals.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <p className="text-4xl">📖</p>
          <p className="font-semibold">No journals yet</p>
          <p className="text-sm opacity-55">Share your Karnataka travel experience.</p>
          <Link
            href="/social/journals/new"
            className="inline-block mt-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--color-saffron)" }}
          >
            Write the first journal →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {journals.map((j) => {
            const isOwn = j.user_id === user.id;
            const tipsPreview = j.tips ? j.tips.slice(0, 120) + (j.tips.length > 120 ? "…" : "") : null;
            return (
              <div key={j.id} className="card p-4 space-y-2">
                <div className="flex items-start gap-2 justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{j.title ?? "Untitled Journal"}</p>
                    {j.spent != null && (
                      <p className="text-xs opacity-60 mt-0.5">Spent: {inr(j.spent)}</p>
                    )}
                  </div>
                  {isOwn && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: "var(--color-forest-3)",
                        color: "var(--color-forest)",
                      }}
                    >
                      by You
                    </span>
                  )}
                </div>
                {tipsPreview && (
                  <p className="text-sm opacity-70 leading-relaxed">{tipsPreview}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
