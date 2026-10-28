"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Plan } from "@/lib/types";
import PrintMap from "@/components/PrintMap";

const FullRouteMap = dynamic(
  () => import("@/components/MapView").then((m) => m.FullRouteMap),
  { ssr: false }
);

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const DAY_COLORS = [
  "#0f5132", "#d97706", "#0369a1", "#be123c", "#7c3aed",
  "#0891b2", "#15803d", "#b45309", "#9333ea", "#0f766e",
];

const KIND_ICON: Record<string, string> = {
  drive: "🚗",
  visit: "📍",
  meal:  "🍽",
  stay:  "🏨",
};

export default function TripPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [activeDay, setActiveDay] = useState<number | "all">("all");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("karnataka-go:trip");
      if (!raw) { setError("no-plan"); return; }
      setPlan(JSON.parse(raw));
    } catch {
      setError("no-plan");
    }
  }, []);

  if (error === "no-plan") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-2xl">🗺️</p>
        <h1 className="text-xl font-semibold">No trip loaded</h1>
        <p className="opacity-70 text-sm">Go back to the planner and click "View Full Route" to open this page.</p>
        <Link
          href="/"
          className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}
        >
          ← Back to planner
        </Link>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const byId = new Map(plan.places.map((p) => [p.id, p]));
  const c = plan.cost;
  const costParts: [string, number, string][] = [
    ["Stay",        c.stay,        "#0f5132"],
    ["Food",        c.food,        "#d97706"],
    ["Transport",   c.transport,   "#0369a1"],
    ["Tickets",     c.tickets,     "#be123c"],
    ["Contingency", c.contingency, "#78716c"],
  ];

  const visibleDays =
    activeDay === "all"
      ? plan.days
      : plan.days.filter((d) => d.day === activeDay);

  const totalKm = plan.days.reduce((s, d) => s + d.km, 0);
  const totalDriveH = Math.round((plan.days.reduce((s, d) => s + d.driveMin, 0) / 60) * 10) / 10;
  const totalPlaces = plan.places.length;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm opacity-60 hover:opacity-100 transition-opacity">← Back to planner</Link>
          <h1 className="mt-1 text-2xl font-bold" style={{ color: "var(--color-forest)" }}>
            Your {plan.days.length}-day Karnataka route
          </h1>
          <p className="text-sm opacity-70 capitalize">
            {plan.variant} plan · {plan.tier} tier · {plan.transport}
          </p>
          {(plan.startName || plan.endName) && (
            <div className="flex items-center gap-2 mt-2 text-sm font-medium">
              <span>🟢 <span style={{ color: "var(--color-forest)" }}>{plan.startName ?? "Bengaluru"}</span></span>
              <span className="opacity-40">→→→</span>
              <span>🔴 <span style={{ color: "var(--color-silk)" }}>{plan.endName ?? plan.startName ?? "Bengaluru"}</span></span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-white"
            style={{ borderColor: "#d4c9b0" }}
          >
            🖨 Print
          </button>
          <Link
            href="/"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--color-saffron)" }}
          >
            ✏️ Edit plan
          </Link>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total cost",   value: inr(c.total),        icon: "💰" },
          { label: "Stops",        value: String(totalPlaces),  icon: "📍" },
          { label: "Distance",     value: `${totalKm} km`,      icon: "🛣" },
          { label: "Drive time",   value: `${totalDriveH} h`,   icon: "🕐" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card p-3 text-center">
            <div className="text-xl mb-0.5">{icon}</div>
            <div className="font-bold text-lg leading-tight">{value}</div>
            <div className="text-xs opacity-60 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Main: map + route detail ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

        {/* Map */}
        <div
          className="card overflow-hidden"
          style={{ height: "520px", padding: 0 }}
        >
          <FullRouteMap plan={activeDay === "all" ? plan : { ...plan, days: visibleDays }} />
        </div>

        {/* Route sidebar */}
        <div className="space-y-4 min-w-0">

          {/* Day filter pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveDay("all")}
              className="rounded-full border px-3 py-1 text-sm font-medium transition-all"
              style={activeDay === "all"
                ? { background: "#1c1917", color: "#fff", borderColor: "#1c1917" }
                : { borderColor: "#d4c9b0", color: "#374151" }}
            >
              All days
            </button>
            {plan.days.map((d, di) => {
              const active = activeDay === d.day;
              const color = DAY_COLORS[di % DAY_COLORS.length];
              return (
                <button
                  key={d.day}
                  onClick={() => setActiveDay(active ? "all" : d.day)}
                  className="rounded-full border px-3 py-1 text-sm font-medium transition-all"
                  style={active
                    ? { background: color, color: "#fff", borderColor: color }
                    : { borderColor: "#d4c9b0", color: "#374151" }}
                >
                  Day {d.day}
                </button>
              );
            })}
          </div>

          {/* Per-day cards */}
          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
            {visibleDays.map((day, di) => {
              const realDi = plan.days.findIndex((d) => d.day === day.day);
              const color = DAY_COLORS[realDi % DAY_COLORS.length];
              const stops = day.placeIds.map((id) => byId.get(id)).filter(Boolean);

              return (
                <div key={day.day} className="card p-4">
                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                      style={{ background: color }}
                    >
                      Day {day.day}
                    </span>
                    {day.date && (
                      <span className="text-xs opacity-60">{day.date}</span>
                    )}
                    <span className="ml-auto text-xs opacity-60">
                      {day.km} km · {Math.round(day.driveMin / 60 * 10) / 10} h drive
                    </span>
                  </div>

                  {/* Day boundary — depart / overnight */}
                  <div className="flex items-center gap-1.5 text-xs mb-2 opacity-70">
                    <span>🛏</span>
                    <span>
                      {di === 0
                        ? <><strong>Depart:</strong> {plan.startName ?? "Bengaluru"}</>
                        : <><strong>From:</strong> {plan.days[di - 1].overnightAt}</>
                      }
                    </span>
                    <span className="mx-1 opacity-40">→</span>
                    <span><strong>Sleep:</strong> {day.overnightAt}</span>
                  </div>

                  {/* Badges */}
                  {day.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {day.badges.map((b) => (
                        <span
                          key={b}
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ background: "rgba(15,81,50,0.1)", color: "var(--color-forest)" }}
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Warnings */}
                  {day.warnings.map((w) => (
                    <p key={w} className="text-xs mb-2 font-medium" style={{ color: "#be123c" }}>⚠ {w}</p>
                  ))}

                  {/* Stop list */}
                  <div className="space-y-2">
                    {stops.map((s, si) => s && (
                      <div key={s.id} className="flex gap-2.5 text-sm">
                        <span
                          className="flex-shrink-0 h-5 w-5 rounded-full text-white grid place-items-center text-xs font-bold mt-0.5"
                          style={{ background: color }}
                        >
                          {si + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug">{s.name}</p>
                          <p className="text-xs opacity-60">{s.region} · {s.hours} · {s.visitMin} min</p>
                          {s.fee > 0 && (
                            <span
                              className="inline-block mt-0.5 rounded text-xs px-1.5 py-0.5 font-medium"
                              style={{ background: "rgba(217,119,6,0.12)", color: "var(--color-saffron)" }}
                            >
                              Entry {inr(s.fee)} / person
                            </span>
                          )}
                          <p className="text-xs opacity-60 mt-0.5 italic">📷 {s.photoTip}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Timeline (compact) */}
                  <details className="mt-3">
                    <summary
                      className="text-xs cursor-pointer font-medium select-none"
                      style={{ color: "var(--color-forest)" }}
                    >
                      View full timeline ({day.items.length} items)
                    </summary>
                    <ol className="mt-2 space-y-1.5 border-l-2 pl-3 ml-1" style={{ borderColor: color + "55" }}>
                      {day.items.map((it, i) => (
                        <li key={i} className="text-xs flex gap-2">
                          <span className="w-20 shrink-0 font-mono opacity-60">{it.start}–{it.end}</span>
                          <span>
                            {KIND_ICON[it.kind]} {it.title}
                            {it.cost > 0 && (
                              <span className="ml-1 opacity-60">({inr(it.cost)})</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Cost breakdown ── */}
      <div className="card p-5">
        <h2 className="font-semibold mb-3">Cost breakdown</h2>
        <div className="flex h-4 overflow-hidden rounded-full mb-3" style={{ background: "#e7dfc8" }}>
          {costParts.map(([n, v, bg]) => (
            <div
              key={n}
              style={{ width: `${(v / c.total) * 100}%`, background: bg }}
              title={`${n}: ${inr(v)}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-sm">
          {costParts.map(([n, v, bg]) => (
            <div key={n} className="text-center">
              <div className="h-2.5 w-2.5 rounded-full mx-auto mb-1" style={{ background: bg }} />
              <div className="font-semibold">{inr(v)}</div>
              <div className="text-xs opacity-60">{n}</div>
            </div>
          ))}
        </div>
        <div
          className="mt-4 pt-3 flex items-center justify-between text-sm font-semibold"
          style={{ borderTop: "1px solid var(--color-temple-2)" }}
        >
          <span>Total estimate</span>
          <span style={{ color: plan.withinBudget ? "var(--color-forest)" : "var(--color-silk)" }}>
            {inr(c.total)} {plan.withinBudget ? "✓ within budget" : "⚠ over budget"}
          </span>
        </div>
        {plan.changes.length > 0 && (
          <div
            className="mt-3 rounded-lg p-3 text-sm"
            style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}
          >
            <p className="font-semibold mb-1">Budget adjustments made</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {plan.changes.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        )}
        <p className="mt-3 text-xs opacity-50">
          Source: {plan.priceInfo.source}. {plan.priceInfo.note}
        </p>
      </div>

      {/* ── Place cards (all stops) ── */}
      <div>
        <h2 className="font-semibold mb-3 text-lg" style={{ color: "var(--color-forest)" }}>
          All stops ({plan.places.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plan.places.map((place) => {
            // Find which day this place appears in
            const dayIdx = plan.days.findIndex((d) => d.placeIds.includes(place.id));
            const color = dayIdx >= 0 ? DAY_COLORS[dayIdx % DAY_COLORS.length] : "#78716c";
            const dayNum = dayIdx >= 0 ? plan.days[dayIdx].day : null;
            return (
              <div key={place.id} className="card p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug">{place.name}</h3>
                  {dayNum !== null && (
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      style={{ background: color }}
                    >
                      Day {dayNum}
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-60">{place.region} · {place.category.join(", ")}</p>
                <p className="text-xs leading-relaxed opacity-80">{place.history}</p>
                <div className="flex flex-wrap gap-2 text-xs mt-auto pt-1" style={{ borderTop: "1px solid var(--color-temple-2)" }}>
                  <span>🕐 {place.hours}</span>
                  <span>⏱ {place.visitMin} min</span>
                  {place.fee > 0 && <span>🎟 {inr(place.fee)}/person</span>}
                  <span>⭐ {place.rating}</span>
                </div>
                <p className="text-xs opacity-60 italic">📷 {place.photoTip}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PRINT-ONLY LAYOUT — hidden on screen, visible @print
          • Page 1 : cover header + static SVG route map + stats
          • Page 2+: every day fully expanded (stops + timeline)
      ══════════════════════════════════════════════════════ */}
      <div className="print-only">

        {/* PAGE 1 ── cover + map */}
        <div className="print-page">
          <div className="print-masthead">
            <div>
              <div className="print-brand">🌿 KarnatakaGo</div>
              <h1 className="print-title">
                {plan.days.length}-Day Karnataka Trip Plan
              </h1>
              <p className="print-subtitle">
                {plan.variant} · {plan.tier} · {plan.transport}
                {(plan.startName || plan.endName) && (
                  <> &nbsp;·&nbsp; {plan.startName ?? "Bengaluru"} → {plan.endName ?? plan.startName ?? "Bengaluru"}</>
                )}
              </p>
            </div>
            <div className="print-cost-box">
              <div className="print-cost-total">{inr(c.total)}</div>
              <div className="print-cost-label">Total estimate</div>
              <div className="print-cost-breakdown">
                {costParts.map(([n, v, bg]) => (
                  <div key={n} className="print-cost-item">
                    <span className="print-cost-dot" style={{ background: bg }} />
                    <span>{n}: {inr(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Static SVG map — no WebGL, prints perfectly */}
          <div className="print-map-container">
            <PrintMap plan={plan} />
          </div>

          <div className="print-stats">
            {([
              { icon: "📍", val: String(totalPlaces),  label: "Stops" },
              { icon: "🛣",  val: `${totalKm} km`,      label: "Distance" },
              { icon: "🕐",  val: `${totalDriveH} h`,   label: "Drive time" },
              { icon: "📅",  val: String(plan.days.length), label: "Days" },
            ] as const).map(({ icon, val, label }) => (
              <div key={label} className="print-stat">
                <span className="print-stat-icon">{icon}</span>
                <span className="print-stat-val">{val}</span>
                <span className="print-stat-label">{label}</span>
              </div>
            ))}
          </div>

          <p className="print-disclaimer">
            Prices are estimates only · Safety information is advisory, not a guarantee ·
            Verify fees, stays and transport before booking · Emergency 112 · Women helpline 1091
          </p>
        </div>

        {/* PAGE 2+ ── one section per day */}
        {plan.days.map((day, di) => {
          const color = DAY_COLORS[di % DAY_COLORS.length];
          const dayStops = day.placeIds.map((id) => byId.get(id)).filter(Boolean);
          return (
            <div key={day.day} className="print-day-page">
              {/* Day header */}
              <div className="print-day-header" style={{ borderLeftColor: color }}>
                <span className="print-day-badge" style={{ background: color }}>Day {day.day}</span>
                {day.date && <span className="print-day-date">{day.date}</span>}
                <span className="print-day-meta">{day.km} km · {Math.round(day.driveMin / 60 * 10) / 10} h drive</span>
                {day.badges.map((b) => (
                  <span key={b} className="print-badge" style={{ color, borderColor: color }}>{b}</span>
                ))}
              </div>

              {day.warnings.map((w) => (
                <p key={w} className="print-warning">⚠ {w}</p>
              ))}

              <div className="print-day-body">
                {/* Stops */}
                <div className="print-stops">
                  <p className="print-col-heading">Stops</p>
                  {dayStops.map((s, si) => s && (
                    <div key={s.id} className="print-stop">
                      <span className="print-stop-num" style={{ background: color }}>{si + 1}</span>
                      <div>
                        <p className="print-stop-name">{s.name}</p>
                        <p className="print-stop-meta">
                          {s.region} · {s.hours} · {s.visitMin} min
                          {s.fee > 0 ? ` · Entry ₹${s.fee}/person` : ""}
                        </p>
                        <p className="print-stop-tip">📷 {s.photoTip}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div className="print-timeline">
                  <p className="print-col-heading">Timeline</p>
                  <ol className="print-timeline-list" style={{ borderLeftColor: color + "55" }}>
                    {day.items.map((it, i) => (
                      <li key={i} className="print-timeline-item">
                        <span className="print-time">{it.start}–{it.end}</span>
                        <span className={it.kind === "visit" ? "font-bold" : ""}>
                          {KIND_ICON[it.kind]} {it.title}
                          {it.cost > 0 && <span className="print-item-cost"> · {inr(it.cost)}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
