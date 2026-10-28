"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { createClient } from "@/lib/supabase/client";

interface SavedTrip {
  id: string;
  preferences: { title?: string };
  days: number;
}

export default function NewJournalPage() {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [form, setForm] = useState({
    trip_id: "",
    title: "",
    tips: "",
    steps: "",
    spent: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth"); return; }

    const supabase = createClient();
    if (!supabase) return;

    supabase
      .from("trips")
      .select("id, preferences, days")
      .eq("user_id", user.id)
      .order("id", { ascending: false })
      .then(({ data, error: err }) => {
        if (!err) setTrips((data as SavedTrip[]) ?? []);
      });
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.trip_id || !form.title.trim()) {
      setError("Trip and title are required.");
      return;
    }
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      trip_id: form.trip_id,
      title: form.title.trim(),
    };
    if (form.tips.trim()) body.tips = form.tips.trim();
    if (form.steps.trim()) body.steps = form.steps.trim();
    if (form.spent) body.spent = Number(form.spent);

    const r = await fetch("/api/social/journals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (r.ok) {
      setSaved(true);
    } else {
      const j = await r.json().catch(() => ({}));
      setError(j.error ?? "Failed to save journal. Please try again.");
    }
    setSaving(false);
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
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
        <Link href="/" className="text-sm underline opacity-50">← Back to planner</Link>
      </div>
    );
  }

  // ── Not signed in (redirect handled in effect) ───────────────────────────
  if (!user) return null;

  // ── Saved ─────────────────────────────────────────────────────────────────
  if (saved) {
    return (
      <div className="max-w-md mx-auto card p-8 text-center space-y-4">
        <p className="text-4xl">✅</p>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-forest)" }}>
          Journal published!
        </h1>
        <p className="text-sm opacity-60">Your travel journal is now live for other travellers to read.</p>
        <Link
          href="/social/journals"
          className="inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}
        >
          View all journals →
        </Link>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg space-y-5">
      <div>
        <Link href="/social/journals" className="text-sm opacity-50 hover:opacity-75 transition-opacity">
          ← Journals
        </Link>
        <h1 className="text-2xl font-extrabold mt-1" style={{ color: "var(--color-forest)" }}>
          ✍ Write a Trip Journal
        </h1>
        <p className="text-sm opacity-60 mt-1">Share your experience to help future travellers.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {/* Trip selector */}
        <label className="form-label">
          Trip *
          <select
            className="field"
            value={form.trip_id}
            onChange={(e) => setForm((f) => ({ ...f, trip_id: e.target.value }))}
            required
          >
            <option value="">— Select a saved trip —</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.preferences?.title ?? `Karnataka ${t.days}-day trip`}
              </option>
            ))}
          </select>
        </label>

        {trips.length === 0 && (
          <p className="text-xs opacity-55 -mt-2">
            No saved trips yet.{" "}
            <Link href="/" className="underline">
              Plan and save a trip first →
            </Link>
          </p>
        )}

        {/* Title */}
        <label className="form-label">
          Journal title *
          <input
            className="field"
            type="text"
            placeholder="e.g. A weekend in Coorg — what nobody tells you"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            maxLength={120}
          />
        </label>

        {/* Tips */}
        <label className="form-label">
          Travel tips
          <textarea
            className="field"
            placeholder="Share your best tips for other travellers…"
            rows={4}
            value={form.tips}
            onChange={(e) => setForm((f) => ({ ...f, tips: e.target.value }))}
            maxLength={2000}
          />
        </label>

        {/* Steps / experience */}
        <label className="form-label">
          Your experience (day-by-day)
          <textarea
            className="field"
            placeholder="Describe your journey step by step…"
            rows={5}
            value={form.steps}
            onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))}
            maxLength={4000}
          />
        </label>

        {/* Spent */}
        <label className="form-label">
          Total spent (₹)
          <input
            className="field"
            type="number"
            placeholder="e.g. 8500"
            value={form.spent}
            onChange={(e) => setForm((f) => ({ ...f, spent: e.target.value }))}
            min={0}
          />
        </label>

        {error && (
          <p className="text-sm" style={{ color: "var(--color-silk)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={saving} className="submit-btn">
          {saving ? "Publishing…" : "Publish Journal"}
        </button>
      </form>
    </div>
  );
}
