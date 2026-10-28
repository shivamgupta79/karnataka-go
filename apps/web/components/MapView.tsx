"use client";
import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Plan, Place, TimelineItem } from "@/lib/types";

// ── Day colour palette ────────────────────────────────────────────────────────
const DAY_COLORS = [
  "#1a6b47", "#d97706", "#0369a1", "#be123c", "#7c3aed",
  "#0891b2", "#15803d", "#b45309", "#9333ea", "#0f766e",
];

// ── Marker visual config per kind ────────────────────────────────────────────
const MARKER_CFG: Record<
  TimelineItem["kind"],
  { symbol: string; bg: string; size: number; zIndex: number }
> = {
  visit:          { symbol: "",    bg: "transparent", size: 30, zIndex: 10 },
  meal:           { symbol: "🍽", bg: "#f59e0b",      size: 24, zIndex: 6  },
  stay:           { symbol: "🏨", bg: "#0369a1",      size: 24, zIndex: 7  },
  fuel:           { symbol: "⛽", bg: "#78716c",      size: 22, zIndex: 5  },
  vehicle_change: { symbol: "🚌", bg: "#7c3aed",      size: 24, zIndex: 8  },
  ghat_warning:   { symbol: "⚠",  bg: "#dc2626",      size: 22, zIndex: 9  },
  drive:          { symbol: "🚗", bg: "#6b7280",      size: 18, zIndex: 1  },
  rest:           { symbol: "☕", bg: "#92400e",      size: 22, zIndex: 5  },
  rental:         { symbol: "🛵", bg: "#d97706",      size: 22, zIndex: 6  },
  transit_info:   { symbol: "🎫", bg: "#7c3aed",      size: 22, zIndex: 6  },
};

/**
 * Build a marker DOM element.
 *
 * KEY FIX for "moving icons": We wrap the visual pin inside an outer div.
 * MapLibre sets `transform` on the OUTER element for positioning.
 * We only scale the INNER element on hover — so MapLibre's positioning
 * transform and the hover scale never conflict.
 */
function makeMarkerEl(
  kind: TimelineItem["kind"],
  label: string,
  color: string,
): HTMLDivElement {
  const cfg = MARKER_CFG[kind];
  const isVisit = kind === "visit";

  // Outer: MapLibre owns this element's transform for positioning
  const outer = document.createElement("div");
  outer.style.cssText = `
    width: ${cfg.size}px;
    height: ${cfg.size}px;
    position: relative;
    cursor: pointer;
  `;

  // Inner: we scale this on hover — never touches MapLibre's transform
  const inner = document.createElement("div");
  inner.style.cssText = `
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: ${isVisit ? color : cfg.bg};
    color: #fff;
    display: grid;
    place-items: center;
    font-size: ${isVisit ? "11px" : "13px"};
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.85);
    will-change: transform;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
    pointer-events: none;   /* outer handles clicks */
  `;
  inner.textContent = isVisit ? label : cfg.symbol;
  inner.setAttribute("data-inner", "1");

  // Hover on the outer triggers the inner scale
  outer.addEventListener("mouseenter", () => {
    inner.style.transform = "scale(1.3)";
    inner.style.boxShadow = "0 4px 14px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.9)";
  });
  outer.addEventListener("mouseleave", () => {
    inner.style.transform = "scale(1)";
    inner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.85)";
  });

  outer.appendChild(inner);
  return outer;
}

function makePopup(item: TimelineItem, dayNum?: number): string {
  const cfg = MARKER_CFG[item.kind];
  const cost = item.cost > 0
    ? `<div style="margin-top:5px;font-size:11px;font-weight:600;color:#d97706">₹${item.cost.toLocaleString("en-IN")}</div>`
    : "";
  const detail = item.detail
    ? `<div style="margin-top:5px;font-size:11px;opacity:.75;line-height:1.45">${item.detail}</div>`
    : "";
  const note = item.note
    ? `<div style="margin-top:4px;font-size:11px;opacity:.6;font-style:italic">📷 ${item.note}</div>`
    : "";
  const time = (item.start && item.end && item.start !== item.end)
    ? `<div style="font-size:10px;opacity:.55;margin-bottom:3px">${item.start}–${item.end}${dayNum ? ` · Day ${dayNum}` : ""}</div>`
    : "";
  return `
    <div style="font-family:system-ui,sans-serif;padding:3px 0;max-width:230px;line-height:1.4">
      ${time}
      <div style="font-weight:700;font-size:13px">${cfg.symbol} ${item.title}</div>
      ${detail}${note}${cost}
    </div>
  `;
}

// ── Stable key from stops array (avoids map recreate on same data) ────────────
function stopsKey(stops: Place[]): string {
  return stops.map((s) => `${s.id}:${s.lat}:${s.lng}`).join("|");
}
function itemsKey(items: TimelineItem[] | undefined): string {
  if (!items) return "";
  return items
    .filter((it) => it.lat != null)
    .map((it) => `${it.kind}:${it.lat}:${it.lng}`)
    .join("|");
}

// ── Single-day map (Itinerary sidebar) ───────────────────────────────────────
export default function MapView({ stops, items, dayNum, dayColor }: {
  stops: Place[];
  items?: TimelineItem[];
  dayNum?: number;
  dayColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Stable dependency strings — only recreate map when coordinates actually change
  const stopsDep  = useMemo(() => stopsKey(stops),           [stops]);
  const itemsDep  = useMemo(() => itemsKey(items),           [items]);
  const colorDep  = dayColor ?? DAY_COLORS[0];

  useEffect(() => {
    if (!ref.current || !stops.length) return;

    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [stops[0].lng, stops[0].lat],
      zoom: 8,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");

    const bounds = new maplibregl.LngLatBounds();

    // Numbered visit markers
    stops.forEach((s, i) => {
      const el = makeMarkerEl("visit", String(i + 1), colorDep);
      new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([s.lng, s.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 18, maxWidth: "240px" }).setHTML(
            makePopup({
              kind: "visit", title: s.name, start: "", end: "", cost: s.fee,
              note: s.photoTip,
              detail: `${s.history.slice(0, 100)}… | ⏱ ${s.visitMin} min | 🕐 ${s.hours}`,
              lat: s.lat, lng: s.lng,
            }, dayNum)
          )
        )
        .addTo(map);
      bounds.extend([s.lng, s.lat]);
    });

    // Utility markers — MAP shows ONLY: stay overnight + ghat warning (safety critical).
    // Meal, fuel, vehicle_change stay in the timeline list only — too many pins = clutter.
    if (items) {
      items
        .filter((it) =>
          (it.kind === "stay" || it.kind === "ghat_warning") &&
          it.lat != null && it.lng != null
        )
        .forEach((it) => {
          const el = makeMarkerEl(it.kind, "", colorDep);
          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([it.lng!, it.lat!])
            .setPopup(new maplibregl.Popup({ offset: 14, maxWidth: "240px" }).setHTML(makePopup(it, dayNum)))
            .addTo(map);
          bounds.extend([it.lng!, it.lat!]);
        });
    }

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature", properties: {},
          geometry: { type: "LineString", coordinates: stops.map((s) => [s.lng, s.lat]) },
        },
      });
      map.addLayer({ id: "route-shadow", type: "line", source: "route",
        paint: { "line-color": "#000", "line-width": 5, "line-opacity": 0.08 } });
      map.addLayer({ id: "route", type: "line", source: "route",
        paint: { "line-color": colorDep, "line-width": 3, "line-dasharray": [3, 2] } });
      if (stops.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
    });

    return () => map.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsDep, itemsDep, colorDep, dayNum]);  // stable strings, not object refs

  return (
    <div ref={ref} className="h-80 w-full overflow-hidden rounded-2xl md:h-full md:min-h-96" />
  );
}

// ── Map legend ────────────────────────────────────────────────────────────────
export function MapLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs px-1 pb-1" style={{ opacity: 0.7 }}>
      {([
        ["📍", "Visit stop"],
        ["🏨", "Overnight stay"],
        ["⚠",  "Ghat road"],
      ] as [string, string][]).map(([emoji, label]) => (
        <span key={label} className="flex items-center gap-1">
          <span>{emoji}</span> {label}
        </span>
      ))}
      <span className="opacity-50 ml-1">· Meal, fuel, transport details in timeline below</span>
    </div>
  );
}

// ── Full-trip map (trip review page) ─────────────────────────────────────────
export function FullRouteMap({ plan }: { plan: Plan }) {
  const ref = useRef<HTMLDivElement>(null);

  // Stable dep — recreate only when plan structure changes
  const planDep = useMemo(
    () => plan.days.map((d) => d.placeIds.join(",")).join("|"),
    [plan]
  );

  useEffect(() => {
    if (!ref.current || !plan.places.length) return;

    const byId = new Map(plan.places.map((p) => [p.id, p]));
    const allCoords = plan.places.map((p): [number, number] => [p.lng, p.lat]);
    const cx = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length;
    const cy = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length;

    const map = new maplibregl.Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [cx, cy], zoom: 7,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    const bounds = new maplibregl.LngLatBounds();
    allCoords.forEach((c) => bounds.extend(c));

    map.on("load", () => {
      // Route lines per day
      plan.days.forEach((day, di) => {
        const stops = day.placeIds.map((id) => byId.get(id)).filter(Boolean) as Place[];
        if (stops.length < 2) return;
        const color = DAY_COLORS[di % DAY_COLORS.length];
        const srcId = `route-d${di}`;

        map.addSource(srcId, {
          type: "geojson",
          data: { type: "Feature", properties: {},
            geometry: { type: "LineString", coordinates: stops.map((s) => [s.lng, s.lat]) } },
        });
        map.addLayer({ id: `${srcId}-halo`, type: "line", source: srcId,
          paint: { "line-color": "#000", "line-width": 7, "line-opacity": 0.08 } });
        map.addLayer({ id: srcId, type: "line", source: srcId,
          paint: { "line-color": color, "line-width": 3.5, "line-dasharray": [3, 2] } });
      });

      // Visit markers (numbered, colour per day)
      plan.days.forEach((day, di) => {
        const color = DAY_COLORS[di % DAY_COLORS.length];
        const stops = day.placeIds.map((id) => byId.get(id)).filter(Boolean) as Place[];

        stops.forEach((s, si) => {
          const el = makeMarkerEl("visit", String(si + 1), color);
          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([s.lng, s.lat])
            .setPopup(new maplibregl.Popup({ offset: 18, maxWidth: "240px" }).setHTML(
              makePopup({
                kind: "visit", title: s.name, start: "", end: "", cost: s.fee,
                note: s.photoTip,
                detail: `Day ${day.day} · ${s.region} | ⏱ ${s.visitMin} min | 🕐 ${s.hours}`,
                lat: s.lat, lng: s.lng,
              }, day.day)
            ))
            .addTo(map);
        });

        // Utility markers per day — only stay + ghat_warning on the map
        day.items
          .filter((it) =>
            (it.kind === "stay" || it.kind === "ghat_warning") &&
            it.lat != null && it.lng != null
          )
          .forEach((it) => {
            const el = makeMarkerEl(it.kind, "", color);
            new maplibregl.Marker({ element: el, anchor: "center" })
              .setLngLat([it.lng!, it.lat!])
              .setPopup(new maplibregl.Popup({ offset: 14, maxWidth: "240px" }).setHTML(makePopup(it, day.day)))
              .addTo(map);
            bounds.extend([it.lng!, it.lat!]);
          });
      });

      map.fitBounds(bounds, { padding: 72, maxZoom: 10 });
    });

    return () => map.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planDep]);  // stable string dep

  return <div ref={ref} className="h-full w-full" style={{ borderRadius: "inherit" }} />;
}
