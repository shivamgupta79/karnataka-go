"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import type { Plan, Place } from "@/lib/types";

const FullRouteMap = dynamic(
  () => import("@/components/MapView").then((m) => m.FullRouteMap),
  { ssr: false }
);

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const DAY_COLORS = [
  "#1a6b47", "#d97706", "#0369a1", "#be123c", "#7c3aed",
  "#0891b2", "#15803d", "#b45309", "#9333ea", "#0f766e",
];

function formatWhatsApp(plan: Plan, title: string, url: string): string {
  const inrFmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  const lines = [
    `🌿 *${title}*`,
    `📍 ${plan.places.length} stops · ${plan.days.length} days · ${inrFmt(plan.cost.total)} total`,
    ``,
    ...plan.days.map((d) => {
      const stops = d.placeIds.join(", ");
      return `*Day ${d.day}${d.date ? ` (${d.date})` : ""}* — ${d.km} km\n${stops}`;
    }),
    ``,
    `🔗 View full plan: ${url}`,
    `_Planned with KarnatakaGo_`,
  ];
  return lines.join("\n");
}

export function SharedTripView({ plan, title, tripId }: { plan: Plan; title: string; tripId: string }) {
  const [copied, setCopied] = useState(false);
  const byId = new Map(plan.places.map((p) => [p.id, p]));
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/trip/${tripId}` : `/trip/${tripId}`;
  const c = plan.cost;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const text = formatWhatsApp(plan, title, shareUrl);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm opacity-60 hover:opacity-100 transition-opacity">← Plan your own trip</Link>
          <h1 className="mt-1 text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>{title}</h1>
          <p className="text-sm opacity-60 capitalize mt-0.5">
            {plan.variant} · {plan.tier} · {plan.transport} · {plan.days.length} days
          </p>
        </div>
        {/* Share buttons */}
        <div className="flex flex-wrap gap-2">
          <button onClick={copyLink}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all"
            style={{ borderColor: "var(--color-temple-2)" }}>
            {copied ? "✓ Copied!" : "🔗 Copy link"}
          </button>
          <button onClick={shareWhatsApp}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "#25D366" }}>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--color-temple-2)" }}>
            🖨 Print
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total cost",    value: inr(c.total),                           icon: "💰" },
          { label: "Per person",    value: inr(c.total / Math.max(1, plan.days.length)), icon: "👤" },
          { label: "Stops",         value: String(plan.places.length),              icon: "📍" },
          { label: "Distance",      value: `${plan.days.reduce((s, d) => s + d.km, 0)} km`, icon: "🛣" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card p-3 text-center">
            <div className="text-xl mb-0.5">{icon}</div>
            <div className="font-bold text-lg leading-tight">{value}</div>
            <div className="text-xs opacity-60 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Map ── */}
      <div className="card overflow-hidden" style={{ height: "460px", padding: 0 }}>
        <FullRouteMap plan={plan} />
      </div>

      {/* ── Day breakdown ── */}
      <div className="space-y-3">
        <h2 className="font-bold text-lg" style={{ color: "var(--color-forest)" }}>Day-by-day route</h2>
        {plan.days.map((day, di) => {
          const color = DAY_COLORS[di % DAY_COLORS.length];
          const stops = day.placeIds.map((id) => byId.get(id)).filter(Boolean) as Place[];
          return (
            <div key={day.day} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: color }}>
                  Day {day.day}
                </span>
                {day.date && <span className="text-xs opacity-60">{day.date}</span>}
                <span className="ml-auto text-xs opacity-60">{day.km} km</span>
              </div>
              <div className="space-y-2">
                {stops.map((s, si) => (
                  <div key={s.id} className="flex gap-2.5 text-sm">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full text-white grid place-items-center text-xs font-bold"
                      style={{ background: color }}>{si + 1}</span>
                    <div>
                      <span className="font-semibold">{s.name}</span>
                      <span className="opacity-60 text-xs ml-2">{s.region}</span>
                      {/* Google Maps link */}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="ml-2 text-xs underline" style={{ color: "var(--color-forest)" }}>
                        Maps ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CTA ── */}
      <div className="card p-6 text-center space-y-3">
        <p className="text-lg font-bold" style={{ color: "var(--color-forest)" }}>Want to plan your own trip?</p>
        <p className="text-sm opacity-70">Get a personalised Karnataka itinerary with budget, safety and AI notes.</p>
        <Link href="/" className="inline-block rounded-xl px-6 py-3 font-bold text-white"
          style={{ background: "var(--color-saffron)" }}>
          🗺 Plan my Karnataka trip →
        </Link>
      </div>
    </div>
  );
}
