"use client";
import { useState } from "react";
import PlannerForm from "@/components/PlannerForm";
import Itinerary from "@/components/Itinerary";
import BannerStrip from "@/components/BannerStrip";
import type { ChecklistGroup, Plan, Prefs } from "@/lib/types";

export default function Home() {
  const [prefs, setPrefs] = useState<Prefs>({
    days: 3, budget: 25000, travellers: 2, interests: ["heritage", "temples"],
    group: "couple", pace: "relaxed", transport: "car",
    month: new Date().getMonth() + 1, language: "English",
    startPoint: undefined, endPoint: undefined,
  });
  const [data, setData] = useState<{ plans: Plan[]; checklist: ChecklistGroup[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!r.ok) throw new Error("Please check the form values and try again.");
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <>
      {/* ── Top banners / announcements ── */}
      <BannerStrip position="top" />

      {/* ── Hero ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🌿</span>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--color-forest)" }}
          >
            Plan your Karnataka trip
          </h1>
        </div>
        <p className="text-base opacity-65 max-w-2xl leading-relaxed">
          Heritage temples, coastal beaches, coffee hills and wildlife — AI-powered
          itineraries with a budget check and safety notes built in.
        </p>
        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            "🏛 20 curated places",
            "💰 Budget-aware routing",
            "🛡 Safety ratings",
            "🗺 Interactive map",
            "✨ AI travel notes",
          ].map((f) => (
            <span
              key={f}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "rgba(26,107,71,0.1)",
                color: "var(--color-forest)",
                border: "1px solid rgba(26,107,71,0.2)",
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      <PlannerForm prefs={prefs} setPrefs={setPrefs} onSubmit={submit} loading={loading} />

      {/* ── Inline ads (shown between form and results) ── */}
      <BannerStrip position="inline" />

      {error && (
        <div className="alert-error mt-4 flex items-start gap-2 text-sm">
          <span className="text-lg leading-none flex-shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {data && (
        <Itinerary
          plans={data.plans}
          checklist={data.checklist}
          language={prefs.language}
          budget={prefs.budget}
          travellers={prefs.travellers}
          prefs={prefs}
        />
      )}
    </>
  );
}
