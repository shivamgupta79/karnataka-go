"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { createClient } from "@/lib/supabase/client";

type SavedTrip = {
  id: string;
  days: number;
  budget: number;
  status: string;
  preferences: {
    title?: string;
    plan?: { variant?: string; cost?: { total?: number } };
  };
};

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function MyTripsPage() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const [trips, setTrips]     = useState<SavedTrip[]>([]);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied]   = useState<string | null>(null); // trip id that was just copied
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !configured) { setFetching(false); return; }

    const supabase = createClient();
    if (!supabase) { setFetching(false); return; }

    supabase
      .from("trips")
      .select("id, days, budget, preferences, status")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (!error) setTrips((data as SavedTrip[]) ?? []);
        setFetching(false);
      });
  }, [user, loading, configured]);

  function copyLink(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/trip/${id}`).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function deleteTrip(id: string) {
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    setDeleting(id);
    const supabase = createClient();
    if (!supabase) { setDeleting(null); return; }
    await supabase.from("trips").delete().eq("id", id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setDeleting(null);
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || fetching) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4"
          style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }} />
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
          Add Supabase credentials to <code className="font-mono bg-black/10 px-1 rounded">.env.local</code> to
          enable saved trips and accounts.
        </p>
        <Link href="/auth" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}>Setup guide →</Link>
        <Link href="/" className="text-sm underline opacity-50">← Back to planner</Link>
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold">Sign in to see your trips</h1>
        <p className="text-sm opacity-60">Create a free account to save and share your Karnataka plans.</p>
        <Link href="/auth"
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}>
          Sign in or sign up →
        </Link>
      </div>
    );
  }

  // ── No trips yet ─────────────────────────────────────────────────────────
  if (trips.length === 0) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>My saved trips</h1>
          <Link href="/" className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--color-saffron)" }}>+ New trip</Link>
        </div>
        <div className="card p-12 text-center space-y-4">
          <p className="text-5xl">🗺️</p>
          <p className="font-semibold text-lg">No saved trips yet</p>
          <p className="text-sm opacity-60 max-w-xs mx-auto">
            Plan a trip and click <strong>💾 Save trip</strong> to keep it here. Saved trips get a shareable link.
          </p>
          <Link href="/"
            className="inline-block mt-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--color-saffron)" }}>
            Plan a trip →
          </Link>
        </div>
      </div>
    );
  }

  // ── Trip list ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>My saved trips</h1>
          <p className="text-sm opacity-55 mt-0.5">{trips.length} trip{trips.length !== 1 ? "s" : ""} saved</p>
        </div>
        <Link href="/" className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--color-saffron)" }}>+ New trip</Link>
      </div>

      <div className="space-y-3">
        {trips.map((t) => {
          const title   = t.preferences?.title ?? `Karnataka ${t.days}-day trip`;
          const total   = t.preferences?.plan?.cost?.total ?? t.budget;
          const variant = t.preferences?.plan?.variant ?? "";
          const isDeleting = deleting === t.id;
          const justCopied = copied === t.id;

          return (
            <div key={t.id} className="card p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="text-3xl flex-shrink-0 mt-0.5">🌿</div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{title}</p>
                  <p className="text-xs opacity-55 mt-0.5 capitalize">
                    {t.days} day{t.days !== 1 ? "s" : ""} · {inr(total)} · {variant || "plan"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0 mt-0.5">
                  <Link
                    href={`/trip/${t.id}`}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ background: "var(--color-forest)" }}>
                    View
                  </Link>

                  <button
                    onClick={() => copyLink(t.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all"
                    style={{
                      borderColor: justCopied ? "var(--color-forest)" : "var(--color-temple-2)",
                      color:       justCopied ? "var(--color-forest)" : "inherit",
                    }}>
                    {justCopied ? "✓ Copied!" : "🔗 Share"}
                  </button>

                  <button
                    onClick={() => deleteTrip(t.id)}
                    disabled={isDeleting}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold border transition-all disabled:opacity-40"
                    style={{ borderColor: "var(--color-temple-2)", color: "var(--color-silk)" }}
                    title="Delete trip">
                    {isDeleting ? "…" : "🗑"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs opacity-40 text-center">
        Shared links are publicly readable. Only you can delete them.
      </p>
    </div>
  );
}
