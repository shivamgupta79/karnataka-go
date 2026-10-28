"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ChecklistGroup, Plan, Place, Prefs } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import PriceCard from "@/components/PriceCard";

const MapView = dynamic(() => import("./MapView"), { ssr: false });
const MapLegend = dynamic(() => import("./MapView").then((m) => m.MapLegend), { ssr: false });

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const LABEL = { cheapest: "Cheapest", balanced: "Balanced", safest: "Safest" } as const;

const KIND_ICON: Record<string, string> = {
  drive:          "🚗",
  visit:          "📍",
  meal:           "🍽",
  stay:           "🏨",
  fuel:           "⛽",
  vehicle_change: "🚌",
  ghat_warning:   "⚠️",
  rest:           "☕",
  rental:         "🛵",
  transit_info:   "🎫",
};
const KIND_COLOR: Record<string, string> = {
  meal:           "#d97706",
  fuel:           "#78716c",
  vehicle_change: "#7c3aed",
  ghat_warning:   "#dc2626",
  stay:           "#0369a1",
  rest:           "#92400e",
  rental:         "#d97706",
  transit_info:   "#7c3aed",
};

function formatWhatsApp(plan: Plan, perPerson: number, shareUrl: string | null): string {
  const lines = [
    `🌿 *My Karnataka ${plan.days.length}-day trip*`,
    `${plan.days.length} days · ${plan.places.length} stops · ${inr(plan.cost.total)} total (${inr(perPerson)}/person)`,
    ``,
    ...plan.days.map((d) => `*Day ${d.day}${d.date ? ` (${d.date})` : ""}*: ${d.placeIds.join(", ")}`),
    ``,
    shareUrl ? `🔗 Full plan: ${shareUrl}` : `Planned with KarnatakaGo`,
  ];
  return lines.join("\n");
}

export default function Itinerary({ plans, checklist, language, budget, travellers, prefs }: {
  plans: Plan[]; checklist: ChecklistGroup[]; language: string; budget: number;
  travellers: number; prefs?: Prefs;
}) {
  const [variant, setVariant]         = useState<Plan["variant"]>("balanced");
  const [dayIdx, setDayIdx]           = useState(0);
  const [story, setStory]             = useState("");
  const [busy, setBusy]               = useState(false);
  const [saving, setSaving]           = useState(false);
  const [savedId, setSavedId]         = useState<string | null>(null);
  const [saveErr, setSaveErr]         = useState("");
  const [copied, setCopied]           = useState(false);
  const [openPricePlaceId, setOpenPricePlaceId] = useState<string | null>(null);

  const router    = useRouter();
  const { user }  = useAuth();

  const plan  = plans.find((p) => p.variant === variant)!;
  const day   = plan.days[Math.min(dayIdx, plan.days.length - 1)];
  const byId  = useMemo(() => new Map(plan.places.map((p) => [p.id, p])), [plan]);
  const stops = (day?.placeIds ?? []).map((id) => byId.get(id)).filter(Boolean) as Place[];
  const c = plan.cost;
  const perPerson = Math.ceil(c.total / Math.max(1, travellers));

  const shareUrl = savedId ? `${typeof window !== "undefined" ? window.location.origin : ""}/trip/${savedId}` : null;

  const parts: [string, number, string][] = [
    ["Stay",        c.stay,        "#1a6b47"],
    ["Food",        c.food,        "#d97706"],
    ["Transport",   c.transport,   "#0369a1"],
    ["Tickets",     c.tickets,     "#be123c"],
    ["Contingency", c.contingency, "#78716c"],
  ];

  function viewFullRoute() {
    sessionStorage.setItem("karnataka-go:trip", JSON.stringify(plan));
    router.push("/trip");
  }

  async function saveTrip() {
    if (!user) { router.push("/auth"); return; }
    setSaving(true); setSaveErr("");
    try {
      const r = await fetch("/api/save-trip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, prefs, title: `Karnataka ${plan.days.length}-day ${variant} trip` }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setSavedId(j.id);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  }

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const text = formatWhatsApp(plan, perPerson, shareUrl);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function narrate() {
    setBusy(true); setStory("");
    try {
      const r = await fetch("/api/narrate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, language }),
      });
      const text = await r.text();
      let j: { text?: string; error?: string } = {};
      try { j = JSON.parse(text); } catch { /* empty */ }
      setStory(!r.ok ? (j.error ?? `Server error ${r.status}`) : (j.text ?? j.error ?? "No notes returned."));
    } catch (e) {
      setStory(e instanceof Error ? e.message : "Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 grid gap-6 md:grid-cols-2">
      <div className="space-y-4">

        {/* ── Variant tabs ── */}
        <div className="flex flex-wrap gap-2" role="tablist">
          {plans.map((p) => {
            const active = p.variant === variant;
            return (
              <button key={p.variant} role="tab" aria-selected={active}
                onClick={() => { setVariant(p.variant); setDayIdx(0); setStory(""); setSavedId(null); }}
                className="rounded-xl border px-3 py-2 text-sm font-semibold transition-all"
                style={active
                  ? { borderColor: "var(--color-forest)", background: "var(--color-forest)", color: "#fff" }
                  : { borderColor: "var(--color-temple-2)", color: "inherit" }}>
                {LABEL[p.variant]} · {inr(p.cost.total)}
              </button>
            );
          })}
        </div>

        {/* ── Route endpoint banner ── */}
        {(plan.startName || plan.endName) && (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
            style={{ background: "var(--color-forest-3)", border: "1px solid rgba(26,107,71,0.2)" }}>
            <span>🟢</span>
            <span style={{ color: "var(--color-forest)" }}>{plan.startName ?? "Bengaluru"}</span>
            <span className="flex-1 border-t border-dashed mx-1" style={{ borderColor: "var(--color-forest)", opacity: 0.35 }} />
            <span className="text-xs opacity-60">via {plan.places.length} stops</span>
            <span className="flex-1 border-t border-dashed mx-1" style={{ borderColor: "var(--color-silk)", opacity: 0.35 }} />
            <span style={{ color: "var(--color-silk)" }}>{plan.endName ?? plan.startName ?? "Bengaluru"}</span>
            <span>🔴</span>
          </div>
        )}

        {/* ── Transport summary banner ── */}
        {plan.transportSummary && (
          <div className="flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium"
            style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <span className="flex-shrink-0 mt-0.5">🚦</span>
            <span style={{ color: "#7c3aed" }}>{plan.transportSummary}</span>
          </div>
        )}

        {/* ── Cost card ── */}
        <div className="card p-4">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h2 className="font-bold text-base">Estimated total {inr(c.total)}</h2>
            <div className="flex items-center gap-3">
              {/* Per-person cost */}
              <span className="text-sm font-semibold rounded-full px-2.5 py-0.5"
                style={{ background: "rgba(26,107,71,0.1)", color: "var(--color-forest)" }}>
                {inr(perPerson)} / person
              </span>
              <span className="text-sm font-medium"
                style={{ color: plan.withinBudget ? "var(--color-forest-2)" : "var(--color-silk)" }}>
                {plan.withinBudget ? `✓ Within ${inr(budget)}` : `⚠ Over ${inr(budget)}`}
              </span>
            </div>
          </div>

          {/* Cost bar */}
          <div className="my-3 flex h-3 overflow-hidden rounded-full" style={{ background: "#e7dfc8" }}>
            {parts.map(([n, v, bg]) => (
              <div key={n} style={{ width: `${(v / c.total) * 100}%`, background: bg }} title={`${n} ${inr(v)}`} />
            ))}
          </div>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {parts.map(([n, v, bg]) => (
              <li key={n} className="flex items-center gap-2">
                <i className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: bg }} />
                <span className="opacity-75">{n}:</span>
                <span className="font-semibold">{inr(v)}</span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs opacity-55 border-t pt-2" style={{ borderColor: "var(--color-temple-2)" }}>
            {plan.priceInfo.source} · {plan.priceInfo.note}
          </p>

          {plan.changes.length > 0 && (
            <details className="mt-3 group" open={plan.changes.length <= 3}>
              <summary
                className="flex items-center justify-between cursor-pointer select-none list-none rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                style={{ background: "rgba(217,119,6,0.08)", color: "#92400e" }}
              >
                <span className="flex items-center gap-2">
                  <span>⚙️</span>
                  <span>Budget adjustments made</span>
                  <span
                    className="text-xs font-bold rounded-full px-2 py-0.5"
                    style={{ background: "#e07b00", color: "#fff" }}
                  >
                    {plan.changes.length}
                  </span>
                </span>
                <span className="text-xs opacity-60 group-open:hidden">Show</span>
                <span className="text-xs opacity-60 hidden group-open:block">Hide</span>
              </summary>

              <ol className="mt-2 space-y-1.5 pl-1">
                {plan.changes.map((x, i) => (
                  <li key={x} className="flex items-start gap-2.5 text-sm">
                    <span
                      className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full text-white grid place-items-center text-xs font-bold"
                      style={{ background: "#e07b00" }}
                    >
                      {i + 1}
                    </span>
                    <span className="opacity-85 leading-snug">{x}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-2.5 text-xs opacity-50 pl-1">
                Increase your budget or add more days to avoid these trade-offs.
              </p>
            </details>
          )}

          {plan.warnings.length > 0 && (
            <div
              className="mt-3 rounded-xl px-3 py-2.5 text-sm space-y-1"
              style={{ background: "rgba(192,21,46,0.06)", border: "1px solid rgba(192,21,46,0.2)" }}
            >
              {plan.warnings.map((w) => (
                <p key={w} className="flex items-start gap-2" style={{ color: "var(--color-silk)" }}>
                  <span className="flex-shrink-0 mt-0.5">⚠️</span>
                  <span className="leading-snug">{w}</span>
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ── Save / share bar ── */}
        <div className="card p-3 flex flex-wrap items-center gap-2">
          {savedId ? (
            <>
              <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--color-forest)" }}>
                ✓ Saved!
              </span>
              <button onClick={copyShareLink}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all"
                style={{ borderColor: "var(--color-temple-2)" }}>
                🔗 {copied ? "Copied!" : "Copy link"}
              </button>
              <button onClick={shareWhatsApp}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: "#25D366" }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <Link href={`/trip/${savedId}`} target="_blank"
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                style={{ borderColor: "var(--color-temple-2)" }}>
                🔍 Preview
              </Link>
            </>
          ) : (
            <>
              <button onClick={saveTrip} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                style={{ background: "var(--color-forest)" }}>
                {saving ? "⏳ Saving…" : "💾 Save trip"}
              </button>
              <button onClick={shareWhatsApp}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                style={{ background: "#25D366" }}>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Share
              </button>
              {!user && (
                <span className="text-xs opacity-60 ml-1">
                  <Link href="/auth" className="underline">Sign in</Link> to save & get a shareable link
                </span>
              )}
              {saveErr && <span className="text-xs" style={{ color: "var(--color-silk)" }}>{saveErr}</span>}
            </>
          )}
        </div>

        {/* ── Day selector ── */}
        <div className="flex flex-wrap gap-2" role="tablist">
          {plan.days.map((d, i) => {
            const active = i === dayIdx;
            // tooltip: "Day 2 · starts near Hampi · ends near Badami"
            const tipStart = i === 0 ? (plan.startName ?? "Bengaluru") : plan.days[i - 1].overnightAt;
            const tipEnd   = d.overnightAt;
            return (
              <button key={d.day} role="tab" aria-selected={active} onClick={() => setDayIdx(i)}
                title={`Day ${d.day}: depart ${tipStart} → overnight ${tipEnd}`}
                className="rounded-full border px-3 py-1 text-sm font-medium transition-all"
                style={active
                  ? { borderColor: "var(--color-saffron)", background: "var(--color-saffron)", color: "#fff" }
                  : { borderColor: "#d4c9b0", color: "inherit" }}>
                Day {d.day}
              </button>
            );
          })}
        </div>

        {/* ── Day detail card ── */}
        {day && (
          <div className="card p-4">
            {/* Day-boundary handoff strip — shows where this day starts (= prev day overnight) */}
            <div
              className="flex items-center gap-2 mb-3 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: "rgba(26,107,71,0.07)", border: "1px solid rgba(26,107,71,0.15)" }}
            >
              <span>🛏</span>
              {dayIdx === 0 ? (
                <span style={{ color: "var(--color-forest)" }}>
                  Depart from <strong>{plan.startName ?? "Bengaluru"}</strong>
                </span>
              ) : (
                <>
                  <span style={{ color: "var(--color-forest)" }}>
                    Overnight: <strong>{plan.days[dayIdx - 1].overnightAt}</strong>
                  </span>
                  <span className="mx-1 opacity-40">→</span>
                  <span className="opacity-70">Day {day.day} starts here</span>
                </>
              )}
              {/* Connect to next day */}
              {dayIdx < plan.days.length - 1 && (
                <span className="ml-auto opacity-55">
                  → Sleep at <strong>{day.overnightAt}</strong>
                </span>
              )}
              {dayIdx === plan.days.length - 1 && plan.endName && (
                <span className="ml-auto opacity-55">
                  → Return to <strong>{plan.endName}</strong>
                </span>
              )}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {day.badges.map((b) => (
                <span key={b} className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ background: "rgba(26,107,71,0.1)", color: "var(--color-forest)" }}>{b}</span>
              ))}
              <span className="text-xs opacity-60 ml-1">
                {day.km} km · {Math.round(day.driveMin / 60 * 10) / 10} h travel
                {day.date ? ` · ${day.date}` : ""}
              </span>
            </div>

            {day.warnings.map((w) => (
              <p key={w} className="text-sm font-medium mb-2 flex items-start gap-1.5" style={{ color: "var(--color-silk)" }}>
                <span className="flex-shrink-0">⚠️</span><span>{w}</span>
              </p>
            ))}

            <ol className="mt-1 space-y-2">
              {day.items.map((it, i) => {
                const place = it.placeId ? byId.get(it.placeId) : undefined;
                const icon = KIND_ICON[it.kind] ?? "·";
                const accentColor = KIND_COLOR[it.kind];
                const isDrive = it.kind === "drive";
                const isFuelWarning = it.kind === "fuel" && it.fuelWarning === true;
                return (
                  <li key={i} className="space-y-2">
                    <div
                      className={`flex gap-3 text-sm ${isDrive ? "opacity-60" : ""} ${isFuelWarning ? "rounded-lg px-2 py-1" : ""}`}
                      style={isFuelWarning ? { background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)" } : undefined}>
                      <span className="w-24 shrink-0 tabular-nums text-xs pt-0.5 opacity-60 font-mono">
                        {it.start}–{it.end}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="mr-1.5">{icon}</span>
                        <span
                          className={it.kind === "visit" ? "font-semibold" : ""}
                          style={accentColor ? { color: accentColor, fontWeight: 600 } : undefined}
                        >
                          {it.title}
                        </span>
                        {it.cost > 0 && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ background: "rgba(217,119,6,0.12)", color: "var(--color-saffron)" }}>
                            {inr(it.cost)}
                          </span>
                        )}
                        {it.kind === "visit" && place && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                            target="_blank" rel="noopener noreferrer"
                            className="ml-2 text-xs opacity-50 hover:opacity-100 underline">
                            Maps ↗
                          </a>
                        )}
                        {it.kind === "visit" && it.placeId && (
                          <button
                            onClick={() => setOpenPricePlaceId(it.placeId === openPricePlaceId ? null : it.placeId!)}
                            className="ml-2 text-xs opacity-50 hover:opacity-100 underline">
                            💰 Prices
                          </button>
                        )}
                        {it.detail && it.kind !== "visit" && (
                          <span className="block text-xs mt-0.5 opacity-60">{it.detail}</span>
                        )}
                        {it.rentalInfo && (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold rounded-full px-2.5 py-0.5"
                            style={{ background: "rgba(217,119,6,0.12)", color: "#92400e" }}>
                            🛵 {it.rentalInfo}
                          </span>
                        )}
                        {it.transitInfo && (
                          <span className="block text-xs mt-0.5 font-medium"
                            style={{ color: "#7c3aed" }}>
                            🎫 {it.transitInfo}
                          </span>
                        )}
                        {it.note && (
                          <span className="block text-xs mt-0.5 opacity-60">📷 {it.note}</span>
                        )}
                      </span>
                    </div>
                    {it.kind === "visit" && it.placeId && openPricePlaceId === it.placeId && (
                      <div className="ml-28">
                        <PriceCard entityType="place" entityId={it.placeId} label={it.title} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-3">
          <button onClick={viewFullRoute}
            className="flex-1 rounded-xl border-2 px-4 py-3 font-semibold transition-colors"
            style={{ borderColor: "var(--color-forest)", color: "var(--color-forest)" }}>
            🗺 Full Route
          </button>
          <button onClick={narrate} disabled={busy}
            className="flex-1 rounded-xl px-4 py-3 font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--color-forest)" }}>
            {busy ? "✍ Writing…" : "✨ AI notes"}
          </button>
          <button onClick={() => window.print()}
            className="rounded-xl border-2 px-4 py-3 font-semibold transition-colors"
            style={{ borderColor: "var(--color-temple-2)", color: "inherit" }}>
            🖨
          </button>
        </div>

        {story && (
          <div className="card p-4 text-sm whitespace-pre-wrap leading-relaxed"
            style={{ borderLeft: "3px solid var(--color-saffron)" }}>
            {story}
          </div>
        )}

        {/* ── Checklist ── */}
        <details className="card p-4">
          <summary className="cursor-pointer font-semibold select-none" style={{ color: "var(--color-forest)" }}>
            🎒 What to carry
          </summary>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            {checklist.map((g) => (
              <div key={g.title}>
                <p className="font-semibold mb-1 opacity-80">{g.title}</p>
                <div className="space-y-1">
                  {g.items.map((item) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" style={{ accentColor: "var(--color-forest)" }} />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* ── Map ── */}
      <div className="md:sticky md:top-4 md:h-[80vh] rounded-xl overflow-hidden flex flex-col gap-2">
        <MapLegend />
        <div className="flex-1 rounded-xl overflow-hidden">
          <MapView
            stops={stops}
            items={day?.items}
            dayNum={day?.day}
            dayColor={["#1a6b47","#d97706","#0369a1","#be123c","#7c3aed","#0891b2","#15803d","#b45309","#9333ea","#0f766e"][dayIdx % 10]}
          />
        </div>
      </div>
    </section>
  );
}
