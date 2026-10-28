import placesJson from "@/data/places.json";
import type { CostBreakdown, Day, Place, Plan, Prefs, Tier, TimelineItem, Transport, Variant } from "./types";
import { driveMinutes, haversine, LL, nearestOrder, roadKm } from "./geo";
import { findLocation, KNOWN_LOCATIONS } from "./locations";

export const PLACES = placesJson as Place[];
const BY_ID = new Map(PLACES.map((p) => [p.id, p]));
const DEFAULT_START: LL = { lat: 12.9716, lng: 77.5946 }; // Bengaluru

const STAY: Record<Tier, number>  = { budget: 1200, standard: 3000, comfort: 5500 };
const FOOD: Record<Tier, number>  = { budget: 500,  standard: 900,  comfort: 1500 };
const RATE: Record<Transport, { perKm: number; per: "vehicle" | "person" }> = {
  car:   { perKm: 11,  per: "vehicle" },
  taxi:  { perKm: 14,  per: "vehicle" },
  bike:  { perKm: 3.5, per: "vehicle" },
  bus:   { perKm: 2.2, per: "person"  },
  train: { perKm: 1.8, per: "person"  },
  mix:   { perKm: 4.5, per: "person"  }, // weighted: ~40% train@1.8 + ~40% bus@2.2 + ~20% bike rental
};

// ── Transport reference data ──────────────────────────────────────────────────

/** Insert a fuel stop for car every N km */
const FUEL_STOP_INTERVAL_CAR_KM  = 250;
/** Insert a fuel stop for bike every N km */
const FUEL_STOP_INTERVAL_BIKE_KM = 120;
/** Warn car drivers if a remote ghat stretch has no petrol within this many km */
const FUEL_WARNING_REMOTE_KM_CAR  = 80;
/** Warn bike riders if a remote ghat stretch has no petrol within this many km */
const FUEL_WARNING_REMOTE_KM_BIKE = 50;

/** Towns with reliable petrol bunk stations across Karnataka */
const PETROL_TOWNS = [
  "Bengaluru", "Mysuru", "Mangaluru", "Hubli", "Hubballi", "Dharwad", "Belagavi",
  "Kalaburagi", "Ballari", "Shivamogga", "Tumakuru", "Davanagere", "Davangere",
  "Bidar", "Vijayapura", "Hassan", "Mandya", "Udupi", "Chikkamagaluru",
  "Madikeri", "Hospet", "Gadag", "Karwar", "Raichur",
];

type Hub = { name: string; lat: number; lng: number };

/** Major railway stations in Karnataka with coordinates */
const RAIL_STATIONS: Hub[] = [
  { name: "Bengaluru City",    lat: 12.977, lng: 77.572 },
  { name: "Mysuru",            lat: 12.303, lng: 76.652 },
  { name: "Mangaluru Central", lat: 12.869, lng: 74.842 },
  { name: "Hubli",             lat: 15.346, lng: 75.124 },
  { name: "Belagavi",          lat: 15.856, lng: 74.508 },
  { name: "Hospet",            lat: 15.269, lng: 76.387 },
  { name: "Hassan",            lat: 13.008, lng: 76.101 },
  { name: "Shivamogga",        lat: 13.929, lng: 75.557 },
  { name: "Davangere",         lat: 14.464, lng: 75.922 },
  { name: "Tumakuru",          lat: 13.338, lng: 77.117 },
];

/** Major KSRTC bus hubs in Karnataka with coordinates */
const KSRTC_HUBS: Hub[] = [
  { name: "Bengaluru Majestic", lat: 12.977, lng: 77.571 },
  { name: "Mysuru",             lat: 12.294, lng: 76.642 },
  { name: "Mangaluru",          lat: 12.862, lng: 74.841 },
  { name: "Hubli",              lat: 15.339, lng: 75.126 },
  { name: "Belagavi",           lat: 15.861, lng: 74.504 },
  { name: "Hospet",             lat: 15.269, lng: 76.387 },
  { name: "Hassan",             lat: 13.008, lng: 76.101 },
  { name: "Madikeri",           lat: 12.422, lng: 75.736 },
  { name: "Chikkamagaluru",     lat: 13.316, lng: 75.776 },
  { name: "Udupi",              lat: 13.341, lng: 74.742 },
  { name: "Shivamogga",         lat: 13.929, lng: 75.557 },
  { name: "Davangere",          lat: 14.464, lng: 75.922 },
];

const VARIANTS: Record<Variant, { tier: Tier; minSafety: number }> = {
  cheapest: { tier: "budget",   minSafety: 0    },
  balanced: { tier: "standard", minSafety: 0    },
  safest:   { tier: "comfort",  minSafety: 0.75 },
};

const fmt = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/** score = 0.35*interest + 0.20*rating + 0.15*season + 0.15*safety + 0.10*uniqueness - 0.05*crowd - 0.10*cost */
export function scorePlace(p: Place, prefs: Prefs, v: Variant): number {
  const w = { interest: 0.35, rating: 0.2, season: 0.15, safety: 0.15, unique: 0.1, crowd: 0.05, cost: 0.1 };
  if (prefs.group === "women" || v === "safest") w.safety += 0.15;
  if (v === "cheapest") w.cost += 0.1;
  const hits = p.category.filter((c) => prefs.interests.includes(c)).length;
  const interest = prefs.interests.length
    ? Math.min(1, hits / Math.min(prefs.interests.length, 2))
    : 0.5;
  const season = p.bestMonths.includes(prefs.month) ? 1 : 0.4;
  const costPenalty = Math.min(1, (p.fee * prefs.travellers) / Math.max(1, prefs.budget / prefs.days / 4));
  return (
    w.interest * interest +
    w.rating   * (p.rating / 5) +
    w.season   * season +
    w.safety   * p.safety +
    w.unique   * p.uniqueness -
    w.crowd    * p.crowd -
    w.cost     * costPenalty
  );
}

function parseHours(h: string): [number, number] {
  if (!/^\d\d:\d\d-\d\d:\d\d$/.test(h)) return [0, 1440];
  const [a, b] = h.split("-").map((x) => {
    const [H, M] = x.split(":").map(Number);
    return H * 60 + M;
  });
  return [a, b];
}

function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Returns the nearest hub within 30 km, or null. */
function nearestHub(pt: LL, hubs: Hub[]): Hub | null {
  let best: Hub | null = null, bestD = Infinity;
  for (const h of hubs) {
    const d = haversine(pt, h);
    if (d < bestD) { bestD = d; best = h; }
  }
  return best && bestD <= 30 ? best : null;
}

/** Check if a point has a petrol town within the given radius km */
function hasPetrolNearby(pt: LL, radiusKm: number): boolean {
  return PETROL_TOWNS.some((tn) => {
    const loc = KNOWN_LOCATIONS.find(
      (l) => l.name.toLowerCase().includes(tn.toLowerCase())
    );
    return loc && haversine(pt, loc) < radiusKm;
  });
}

/** Reorder stops within a single day using nearest-neighbour from the entry anchor. */
async function orderDayStops(anchor: LL, stops: Place[]): Promise<Place[]> {
  if (stops.length <= 1) return stops;
  const url = process.env.OPTIMIZER_URL;
  if (url) {
    try {
      const nodes: LL[] = [anchor, ...stops];
      const t = nodes.map((a) => nodes.map((b) => Math.round((roadKm(a, b) / 45) * 60)));
      const r = nodes.map(() => nodes.map((_, j) => (j > 0 && stops[j - 1].ghat ? 5 : 0)));
      const res = await fetch(`${url}/optimize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          time_matrix: t, risk_matrix: r,
          scores: [0, ...stops.map(() => 100)],
          costs:  [0, ...stops.map((s) => s.fee)],
          budget: 1e9, max_minutes: 1440,
        }),
        signal: AbortSignal.timeout(8000),
      });
      const j = await res.json();
      if (j.status === "ok") {
        const ordered = (j.order as number[]).filter((n) => n > 0).map((n) => stops[n - 1]);
        if (ordered.length === stops.length) return ordered;
      }
    } catch (err) {
      // AbortError is expected when the optimizer doesn't respond within 8 s.
      // Any other error is also non-fatal — we fall through to nearest-neighbour.
      if (err instanceof Error && err.name !== "AbortError") {
        console.warn("[optimizer] fetch failed, using nearest-neighbour:", err.message);
      }
    }
  }
  return nearestOrder(anchor, stops);
}

/**
 * For mix mode: decide the cheapest + safest transport for a segment.
 * Returns timeline items to insert before the drive leg.
 */
function planMixSegments(
  from: LL,
  distKm: number,
  departName: string,
  arriveName: string,
  t: number,
): TimelineItem[] {
  const mixItems: TimelineItem[] = [];

  const trainStation = nearestHub(from, RAIL_STATIONS);
  const ksrtcHub     = nearestHub(from, KSRTC_HUBS);

  if (distKm > 150 && trainStation) {
    // Long segment: train is cheapest and safest
    const costPerPerson = Math.round(distKm * 1.8);
    mixItems.push({
      start: fmt(t), end: fmt(t + 30),
      kind: "vehicle_change",
      title: `🚂 Train: ${trainStation.name} → ${arriveName}`,
      detail: `Train recommended for this ${Math.round(distKm)} km leg. Sleeper ~₹${costPerPerson}/person. Book on IRCTC (irctc.co.in). Arrives well-rested.`,
      cost: costPerPerson,
      lat: trainStation.lat, lng: trainStation.lng,
      transportMode: "mix",
      transitInfo: `IRCTC: irctc.co.in. Sleeper ~₹${costPerPerson}. Book 30 days ahead. Tatkal 1 day before.`,
    });
  } else if (distKm > 50 && ksrtcHub) {
    // Medium segment: KSRTC bus
    const costPerPerson = Math.round(distKm * 2.2);
    mixItems.push({
      start: fmt(t), end: fmt(t + 15),
      kind: "vehicle_change",
      title: `🚌 KSRTC bus: ${ksrtcHub.name} → ${arriveName}`,
      detail: `Bus recommended for this ${Math.round(distKm)} km leg. ~₹${costPerPerson}/person. Book on nammayatri.in or KSRTC app. Airavat AC available for comfort.`,
      cost: costPerPerson,
      lat: ksrtcHub.lat, lng: ksrtcHub.lng,
      transportMode: "mix",
      transitInfo: `KSRTC: nammayatri.in or ksrtc.in. Airavat = AC comfort. Rajahamsa = standard AC. Fare ~₹${costPerPerson}.`,
    });
  } else if (distKm <= 50) {
    // Short hop: rental scooter
    mixItems.push({
      start: fmt(t), end: fmt(t + 20),
      kind: "rental",
      title: `🛵 Rent scooter at ${departName} for local travel (~${Math.round(distKm)} km)`,
      detail: `Short hop — rental scooter is fastest and cheapest. ~₹300–500/half-day or ₹600–900/full day. Carry Aadhaar + licence.`,
      cost: 400,
      lat: from.lat, lng: from.lng,
      transportMode: "mix",
      rentalInfo: `Rent scooter at ${departName} — ₹300–500/half-day or ₹600–900/day`,
    });
  } else {
    // Fallback: outstation taxi
    const fare = Math.round(distKm * 14);
    mixItems.push({
      start: fmt(t), end: fmt(t + 10),
      kind: "transit_info",
      title: `🚕 Taxi: ${departName} → ${arriveName} (~₹${fare})`,
      detail: `No direct transit for ${Math.round(distKm)} km. Ola Outstation / InDriver / local cab. ~₹14/km = ₹${fare}. Book night before in remote areas.`,
      cost: fare,
      lat: from.lat, lng: from.lng,
      transportMode: "mix",
      transitInfo: `Ola Outstation: ~₹14/km = ₹${fare} total. Advance booking in remote areas.`,
    });
  }

  return mixItems;
}

/**
 * Build a human-readable transport summary for the itinerary banner.
 */
function buildTransportSummary(transport: Transport, days: Day[]): string {
  const totalKm = Math.round(days.reduce((s, d) => s + d.km, 0));
  switch (transport) {
    case "car":
      return `🚗 Private car · ${totalKm} km total · Fuel stops every ~${FUEL_STOP_INTERVAL_CAR_KM} km · Fill up before ghat/forest stretches`;
    case "bike":
      return `🛵 Rental motorcycle/scooter · ${totalKm} km · Fuel every ~${FUEL_STOP_INTERVAL_BIKE_KM} km · ₹600–900/day rental · Aadhaar + licence required`;
    case "bus":
      return `🚌 KSRTC state bus · ${totalKm} km · Book on ksrtc.in / nammayatri.in · Airavat AC for comfort · ~₹2.2/km/person`;
    case "train":
      return `🚂 Indian Railways · ${totalKm} km · Book on IRCTC 30 days ahead · Sleeper ~₹1.8/km · Tatkal available 1 day before`;
    case "taxi":
      return `🚕 Cab / auto · ${totalKm} km · Ola/Uber for city legs · Outstation cab for intercity (~₹14/km) · Book remote legs in advance`;
    case "mix":
      return `🔀 Mixed transport · ${totalKm} km · Train for >150 km legs · KSRTC for 50–150 km · Rental scooter for short hops · Cheapest + safest combo`;
  }
}

/**
 * Validate the assembled plan for transport-specific consistency.
 * Returns a list of warnings to append to Plan.warnings.
 */
function validatePlan(days: Day[], transport: Transport): string[] {
  const warnings: string[] = [];

  for (const day of days) {
    const kinds = day.items.map((i) => i.kind);

    if (transport === "bike") {
      const fuelStops = kinds.filter((k) => k === "fuel").length;
      if (day.km > FUEL_STOP_INTERVAL_BIKE_KM && fuelStops === 0) {
        warnings.push(
          `Day ${day.day}: ${day.km} km by bike with no fuel stop marked — plan a fuel stop every ~${FUEL_STOP_INTERVAL_BIKE_KM} km.`
        );
      }
    }

    if (transport === "car") {
      const fuelStops = kinds.filter((k) => k === "fuel").length;
      if (day.km > FUEL_STOP_INTERVAL_CAR_KM && fuelStops === 0) {
        warnings.push(
          `Day ${day.day}: ${day.km} km by car with no fuel stop — fill up before leaving each major town.`
        );
      }
    }

    if (transport === "mix") {
      const hasTransitInfo =
        kinds.includes("vehicle_change") ||
        kinds.includes("rental") ||
        kinds.includes("transit_info");
      if (!hasTransitInfo && day.km > 30) {
        warnings.push(
          `Day ${day.day}: mix mode — vehicle/transit information missing. Check route planning.`
        );
      }
    }

    if (transport === "bus" || transport === "train") {
      const hasBoarding = kinds.includes("vehicle_change") || kinds.includes("transit_info");
      if (!hasBoarding) {
        warnings.push(
          `Day ${day.day}: ${transport === "bus" ? "KSRTC bus" : "train"} boarding info not shown — verify boarding point.`
        );
      }
    }
  }

  return warnings;
}

/**
 * Rich simulate — builds a detailed timeline with lat/lng coordinates and transport-specific items.
 *
 * departLabel: city/place we're departing FROM at the start of this day
 * returnLabel: only set on the last day — the city to return to
 */
function simulate(
  anchor: LL,
  stops: Place[],
  transport: Transport,
  trav: number,
  tier: Tier,
  departLabel: string,
  returnLabel: string | null,
) {
  let t = 8 * 60, drive = 0, km = 0, lunch = false;
  let prev: LL = anchor;
  const items: TimelineItem[] = [];
  const warnings: string[] = [];

  const midLL = (a: LL, b: LL): LL => ({
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2,
  });

  const meal = (nearLL: LL): TimelineItem => ({
    start: fmt(t), end: fmt(t + 45),
    kind: "meal",
    title: "Regional lunch",
    detail: "Stop at a local dhaba or restaurant. Ask for the thali or house speciality.",
    cost: Math.round((FOOD[tier] / 3) * trav),
    lat: nearLL.lat, lng: nearLL.lng,
  });

  // ── Bike rental pickup — once per trip, at the very start of Day 1 ────────
  if (transport === "bike") {
    const alreadyHasRental = items.some((i) => i.kind === "rental");
    if (!alreadyHasRental) {
      items.push({
        start: fmt(t - 30), end: fmt(t),
        kind: "rental",
        title: `🛵 Pick up rental motorcycle / scooter at ${departLabel}`,
        detail: `Rent at ${departLabel}. ~₹600–900/day depending on model. Carry Aadhaar + driving licence. Inspect brakes, tyres and fuel level before leaving the shop.`,
        cost: 0,
        lat: anchor.lat, lng: anchor.lng,
        transportMode: "bike",
        rentalInfo: `Rent motorcycle/scooter at ${departLabel} — ₹600–900/day. Aadhaar + DL required.`,
      });
    }
  }

  for (let si = 0; si < stops.length; si++) {
    const s = stops[si];
    const d = roadKm(prev, s);
    const m = Math.round(driveMinutes(d, transport, s.ghat) * 1.15);

    // ── Pre-drive: ghat warning ─────────────────────────────────────────────
    if (s.ghat) {
      const mid = midLL(prev, s);
      items.push({
        start: fmt(t), end: fmt(t),
        kind: "ghat_warning",
        title: "Ghat road section",
        detail: "Reduced speed zone. Avoid driving after dark. Check road status during monsoon (Jun–Sep).",
        cost: 0, lat: mid.lat, lng: mid.lng,
      });
    }

    // ── Car: fuel stops by interval + remote warning ───────────────────────
    if (transport === "car") {
      const kmBefore = km;
      const kmAfter  = km + d;
      const intervalsBefore = Math.floor(kmBefore / FUEL_STOP_INTERVAL_CAR_KM);
      const intervalsAfter  = Math.floor(kmAfter  / FUEL_STOP_INTERVAL_CAR_KM);
      if (kmBefore > 0 && intervalsAfter > intervalsBefore) {
        const mid = midLL(prev, s);
        items.push({
          start: fmt(t + Math.round(m * 0.45)),
          end:   fmt(t + Math.round(m * 0.45) + 15),
          kind: "fuel",
          title: `⛽ Fuel stop (~${Math.round(kmAfter)} km from start)`,
          detail: `Refuel here. Aim to keep tank above ¼ in remote areas. Carry a 2-litre jerry can for ghat/forest zones.`,
          cost: 0, lat: mid.lat, lng: mid.lng,
          transportMode: "car",
        });
      }
      // Remote ghat: warn if no petrol nearby
      if (s.ghat && !hasPetrolNearby(s, FUEL_WARNING_REMOTE_KM_CAR)) {
        items.push({
          start: fmt(t), end: fmt(t),
          kind: "fuel",
          title: `⚠️ No fuel station within ${FUEL_WARNING_REMOTE_KM_CAR} km — fill up before leaving ${departLabel}`,
          detail: `${s.name} is in a remote ghat area. Fill your tank completely at the last major town before entering this stretch.`,
          cost: 0, lat: prev.lat, lng: prev.lng,
          transportMode: "car",
          fuelWarning: true,
        });
      }
    }

    // ── Bike: frequent fuel stops + remote warning ─────────────────────────
    if (transport === "bike") {
      const kmBefore = km;
      const kmAfter  = km + d;
      const intervalsBefore = Math.floor(kmBefore / FUEL_STOP_INTERVAL_BIKE_KM);
      const intervalsAfter  = Math.floor(kmAfter  / FUEL_STOP_INTERVAL_BIKE_KM);
      if (kmBefore > 0 && intervalsAfter > intervalsBefore) {
        const mid = midLL(prev, s);
        items.push({
          start: fmt(t + Math.round(m * 0.45)),
          end:   fmt(t + Math.round(m * 0.45) + 10),
          kind: "fuel",
          title: `⛽ Fuel stop — scooter (~${Math.round(kmAfter)} km from start)`,
          detail: `Bikes have smaller tanks (~5–8 L). Stop to refuel every ~${FUEL_STOP_INTERVAL_BIKE_KM} km. Check tyre pressure too.`,
          cost: 0, lat: mid.lat, lng: mid.lng,
          transportMode: "bike",
        });
      }
      // Remote ghat: stricter warning for bikes
      if (s.ghat && !hasPetrolNearby(s, FUEL_WARNING_REMOTE_KM_BIKE)) {
        items.push({
          start: fmt(t), end: fmt(t),
          kind: "fuel",
          title: `⚠️ Remote ghat — fill tank before reaching ${s.name}`,
          detail: `No petrol within ${FUEL_WARNING_REMOTE_KM_BIKE} km. A scooter stranded on a ghat road is a serious safety risk — fill up at the last town.`,
          cost: 0, lat: prev.lat, lng: prev.lng,
          transportMode: "bike",
          fuelWarning: true,
        });
      }
    }

    // ── Bus: KSRTC boarding at nearest hub ─────────────────────────────────
    if (transport === "bus") {
      const hub = nearestHub(prev, KSRTC_HUBS);
      if (hub) {
        const alreadyBoarded = items.some(
          (i) => i.kind === "vehicle_change" &&
                 i.transportMode === "bus" &&
                 Math.abs((i.lat ?? 0) - hub.lat) < 0.001 &&
                 Math.abs((i.lng ?? 0) - hub.lng) < 0.001
        );
        if (!alreadyBoarded) {
          const fareCost = Math.round(d * 2.2);
          items.push({
            start: fmt(t), end: fmt(t + 20),
            kind: "vehicle_change",
            title: `🚌 Board KSRTC bus at ${hub.name} bus stand`,
            detail: `Head to ${hub.name} KSRTC bus stand. Book on nammayatri.in or KSRTC app (ksrtc.in). Airavat Club Class for AC comfort. Rajahamsa for standard AC. Approx ₹${fareCost}/person.`,
            cost: 0, lat: hub.lat, lng: hub.lng,
            transportMode: "bus",
            transitInfo: `Book on ksrtc.in or nammayatri.in. Airavat = premium AC. Rajahamsa = standard AC. Fare ~₹${fareCost}/person. Buses every 30–60 min on major routes.`,
          });
          t += 20;
        }
      }
      // KSRTC booking tip on first stop of every day
      if (si === 0) {
        items.push({
          start: fmt(t), end: fmt(t),
          kind: "transit_info",
          title: "KSRTC booking tip",
          detail: "Book Airavat Club Class for AC comfort. Rajahamsa for standard AC. Check ksrtc.in or nammayatri.in 24h in advance.",
          cost: 0, lat: prev.lat, lng: prev.lng,
          transportMode: "bus",
          transitInfo: "Book 24h ahead on ksrtc.in / nammayatri.in. Airavat = premium AC. Rajahamsa = standard AC. Night buses for long legs.",
        });
      }
    }

    // ── Train: nearest station + IRCTC tip + bus fallback ─────────────────
    if (transport === "train") {
      const station = nearestHub(prev, RAIL_STATIONS);
      if (station) {
        const alreadyBoarded = items.some(
          (i) => i.kind === "vehicle_change" &&
                 i.transportMode === "train" &&
                 Math.abs((i.lat ?? 0) - station.lat) < 0.001 &&
                 Math.abs((i.lng ?? 0) - station.lng) < 0.001
        );
        if (!alreadyBoarded) {
          const costSleeper = Math.round(d * 1.8);
          items.push({
            start: fmt(t), end: fmt(t + 30),
            kind: "vehicle_change",
            title: `🚂 Board train at ${station.name} station`,
            detail: `Head to ${station.name} railway station. Book on IRCTC (irctc.co.in) or RailYatri app. Sleeper class ~₹${costSleeper}/person. Book 30 days ahead for confirmed berths. Tatkal opens 1 day before departure.`,
            cost: 0, lat: station.lat, lng: station.lng,
            transportMode: "train",
            transitInfo: `IRCTC: irctc.co.in. Sleeper ~₹${costSleeper}/person. 3AC ~₹${Math.round(costSleeper * 2.2)}. Tatkal: 1 day prior. Book 30 days early.`,
          });
          t += 30;
        }
      } else {
        // No station within 30 km — bus-to-railhead fallback
        const ksrtcFallback = nearestHub(prev, KSRTC_HUBS);
        const alreadyHasFallback = items.some(
          (i) => i.kind === "transit_info" && i.transportMode === "train"
        );
        if (!alreadyHasFallback) {
          items.push({
            start: fmt(t), end: fmt(t + 20),
            kind: "transit_info",
            title: `ℹ️ No train station nearby — take bus to railhead first`,
            detail: `Nearest rail station is >30 km away. Take KSRTC bus to ${ksrtcFallback?.name ?? "nearest town"} then board train from there. Check Google Maps for current schedule.`,
            cost: 0, lat: prev.lat, lng: prev.lng,
            transportMode: "train",
            transitInfo: `No station within 30 km. KSRTC to ${ksrtcFallback?.name ?? "nearest rail hub"}, then train.`,
          });
          t += 20;
        }
      }
      // IRCTC booking tip — once per day
      if (si === 0) {
        items.push({
          start: fmt(t), end: fmt(t),
          kind: "transit_info",
          title: "IRCTC booking tip",
          detail: "Book at irctc.co.in. Download IRCTC Rail Connect app. 2S/SL for budget, 3A/2A for comfort. Tatkal opens 1 day before travel.",
          cost: 0, lat: prev.lat, lng: prev.lng,
          transportMode: "train",
          transitInfo: "IRCTC: irctc.co.in. SL ~₹1.8/km. 3AC ~₹4/km. Tatkal: +30%. Book 30 days early for berths.",
        });
      }
    }

    // ── Taxi: fare estimate for each segment ───────────────────────────────
    if (transport === "taxi") {
      const fare = Math.round(d * 14);
      const isRemote = !hasPetrolNearby(prev, 30);
      items.push({
        start: fmt(t), end: fmt(t + 5),
        kind: "transit_info",
        title: `🚕 Taxi to ${s.name} — approx ₹${fare}`,
        detail: isRemote
          ? `Remote area: book outstation cab in advance (Ola Outstation / InDriver). ₹${fare} for ~${Math.round(d)} km. Confirm pickup with driver the night before.`
          : `Ola/Uber/Rapido available. Outstation rate ~₹14/km. ₹${fare} for ~${Math.round(d)} km. Book 30 min ahead.`,
        cost: fare,
        lat: prev.lat, lng: prev.lng,
        transportMode: "taxi",
        transitInfo: `Ola Outstation / InDriver / Rapido. ~₹14/km. ${isRemote ? "Advance booking required in this remote area." : "Book 30 min ahead."}`,
      });
    }

    // ── Mix: segment-by-segment multimodal planning ────────────────────────
    if (transport === "mix") {
      const mixItems = planMixSegments(prev, d, departLabel, s.name, t);
      items.push(...mixItems);
    }

    // ── Existing: generic rest stop for taxi/mix long drives ───────────────
    if (transport !== "car" && transport !== "bike" && m > 90) {
      const mid = midLL(prev, s);
      items.push({
        start: fmt(t + Math.round(m * 0.45)), end: fmt(t + Math.round(m * 0.45) + 15),
        kind: "fuel",
        title: "Rest & refreshment stop",
        detail: `${Math.round(d)} km drive ahead. Grab water, stretch — ~15 min break.`,
        cost: 0, lat: mid.lat, lng: mid.lng,
      });
    }

    // ── Drive leg ──────────────────────────────────────────────────────────
    if (m > 0) {
      const driveTitle = si === 0
        ? `Depart ${departLabel} → ${s.name} (${Math.round(d)} km)`
        : `Drive to ${s.name} (${Math.round(d)} km)`;
      items.push({ start: fmt(t), end: fmt(t + m), kind: "drive", cost: 0, title: driveTitle });
    }
    t += m; drive += m; km += d;

    // ── Lunch ──────────────────────────────────────────────────────────────
    if (!lunch && t >= 12 * 60 + 15) {
      items.push(meal({ lat: s.lat, lng: s.lng }));
      t += 45; lunch = true;
    }

    // ── Visit stop ─────────────────────────────────────────────────────────
    const [open, close] = parseHours(s.hours);
    if (t < open) t = open;
    if (t + s.visitMin > close) {
      warnings.push(`${s.name}: may close (${s.hours}) before you finish — try to arrive earlier.`);
    }
    items.push({
      start: fmt(t), end: fmt(t + s.visitMin),
      kind: "visit", placeId: s.id, title: s.name,
      cost: s.fee * trav, note: s.photoTip,
      lat: s.lat, lng: s.lng,
      detail: `${s.history.slice(0, 110)}… · Hours: ${s.hours}`,
    });
    t += s.visitMin; prev = s;
  }

  // Late lunch (short day finishing before 15:00)
  if (!lunch && t < 15 * 60) {
    const last = stops[stops.length - 1];
    items.push(meal({ lat: last.lat, lng: last.lng }));
    t += 45;
  }

  const last = stops[stops.length - 1];

  // ── Return leg (last day only) ────────────────────────────────────────────
  if (returnLabel) {
    const retD = roadKm(prev, anchor);
    const retM = Math.round(driveMinutes(retD, transport, false) * 1.15);

    // Transit return items
    if (transport === "bus") {
      items.push({
        start: fmt(t), end: fmt(t + 20),
        kind: "vehicle_change",
        title: `🚌 Board KSRTC bus for return to ${returnLabel}`,
        detail: `Check ksrtc.in for return service to ${returnLabel}. Book in advance for evening/overnight buses.`,
        cost: 0, lat: last.lat, lng: last.lng,
        transportMode: "bus",
        transitInfo: `KSRTC return to ${returnLabel}. ksrtc.in / nammayatri.in. Book same-day or advance.`,
      });
    }
    if (transport === "train") {
      const returnStation = nearestHub(last, RAIL_STATIONS);
      items.push({
        start: fmt(t), end: fmt(t + 20),
        kind: "vehicle_change",
        title: returnStation
          ? `🚂 Board return train at ${returnStation.name}`
          : `🚂 Board return train / bus for ${returnLabel}`,
        detail: `Check IRCTC for return service to ${returnLabel}. Book return ticket when booking outbound.`,
        cost: 0, lat: last.lat, lng: last.lng,
        transportMode: "train",
        transitInfo: `IRCTC: irctc.co.in. Book return ticket simultaneously with outbound.`,
      });
    }
    if (transport === "bike") {
      items.push({
        start: fmt(t + 10), end: fmt(t + 40),
        kind: "rental",
        title: `🛵 Return rental motorcycle / scooter at ${returnLabel}`,
        detail: `Return the bike at ${returnLabel}. Inspect for damage together with the shop. Get a return receipt. Check for extra charges.`,
        cost: 0, lat: anchor.lat, lng: anchor.lng,
        transportMode: "bike",
        rentalInfo: `Return rental bike at ${returnLabel}. Get receipt. Check for damage charges.`,
      });
    }
    if (transport === "mix") {
      const retMixItems = planMixSegments(last, retD, last.name, returnLabel, t);
      items.push(...retMixItems);
    }

    if (retD > 60 && transport !== "bus" && transport !== "train") {
      const mid = midLL(prev, anchor);
      items.push({
        start: fmt(t + Math.round(retM * 0.45)), end: fmt(t + Math.round(retM * 0.45) + 15),
        kind: "fuel", title: "Rest stop on return",
        detail: `${Math.round(retD)} km return journey. Grab food/fuel midway.`,
        cost: 0, lat: mid.lat, lng: mid.lng,
      });
    }
    if (retM > 0) {
      items.push({
        start: fmt(t), end: fmt(t + retM),
        kind: "drive", title: `Return to ${returnLabel} (${Math.round(retD)} km)`, cost: 0,
      });
      t += retM; drive += retM; km += retD;
    }
  }

  // ── Stay / arrive ─────────────────────────────────────────────────────────
  const overnightName  = returnLabel ?? `near ${last.name}`;
  const overnightCoord = returnLabel ? anchor : last;
  items.push({
    start: fmt(t), end: fmt(t + 30),
    kind: "stay",
    title: returnLabel ? `Arrive back at ${returnLabel}` : `Check in near ${last.name}`,
    detail: returnLabel
      ? `Trip complete — you are back at ${returnLabel}.`
      : `Book a hotel or homestay near ${last.name}. Tier: ${tier}. Tomorrow you depart from here.`,
    cost: 0,
    lat: overnightCoord.lat,
    lng: overnightCoord.lng,
  });

  return { items, drive, km, end: t, warnings, overnightName, overnightLat: overnightCoord.lat, overnightLng: overnightCoord.lng };
}

type State = { ids: string[]; tier: Tier; transport: Transport };

/**
 * Core assembly pipeline.
 */
async function assemble(
  prefs: Prefs,
  state: State,
  _v: Variant,
  score: (p: Place) => number,
) {
  // ── 1. Resolve coordinates ───────────────────────────────────────────────
  const startLoc = prefs.startPoint ? findLocation(prefs.startPoint) : undefined;
  const endLoc   = prefs.endPoint   ? findLocation(prefs.endPoint)   : startLoc;
  const START: LL = startLoc  ?? DEFAULT_START;
  const END: LL   = endLoc    ?? START;

  // ── 2. Global nearest-neighbour ordering from START ──────────────────────
  const chosen = state.ids.map((id) => BY_ID.get(id)!);
  const globalOrder = nearestOrder(START, chosen);

  // ── 3. Slice into per-day groups ─────────────────────────────────────────
  const stopsPerDay = prefs.pace === "relaxed" ? 3 : 4;
  const numDays     = Math.min(prefs.days, Math.ceil(globalOrder.length / stopsPerDay));

  const dayGroups: Place[][] = [];
  let idx = 0;
  for (let d = 0; d < numDays; d++) {
    const remaining = numDays - d;
    const take = Math.ceil((globalOrder.length - idx) / remaining);
    dayGroups.push(globalOrder.slice(idx, idx + take));
    idx += take;
  }

  // ── 4 & 5. Build each day ────────────────────────────────────────────────
  const driveCap = (prefs.pace === "relaxed" ? 6 : 8) * 60;
  const days: Day[] = [];
  let anchor: LL     = START;
  let overnightLabel = startLoc?.name ?? "Bengaluru";

  for (let i = 0; i < dayGroups.length; i++) {
    const isLastDay = i === dayGroups.length - 1;
    const warnings: string[] = [];

    let stops = await orderDayStops(anchor, dayGroups[i]);

    // Closed-day filtering
    const date = prefs.startDate ? addDays(prefs.startDate, i) : undefined;
    if (date) {
      const wd = new Date(date + "T00:00:00").getDay();
      const open = stops.filter((s) => s.closedDay !== wd);
      stops.filter((s) => s.closedDay === wd).forEach((s) =>
        warnings.push(
          `${s.name} is closed on ${WEEKDAYS[wd]}${open.length ? " — removed" : " — verify before going"}.`
        )
      );
      if (open.length) stops = open;
    }

    const returnLabel = isLastDay
      ? (endLoc?.name ?? startLoc?.name ?? null)
      : null;

    let sim = simulate(
      anchor, stops, state.transport, prefs.travellers, state.tier,
      overnightLabel,
      returnLabel,
    );

    // Trim day if it runs too long
    while ((sim.drive > driveCap || sim.end > 20 * 60) && stops.length > 1) {
      const worst = stops.reduce((a, b) => (score(a) <= score(b) ? a : b));
      stops = stops.filter((s) => s.id !== worst.id);
      warnings.push(`Dropped ${worst.name}: day would exceed the driving limit or daylight hours.`);
      sim = simulate(anchor, stops, state.transport, prefs.travellers, state.tier, overnightLabel, returnLabel);
    }
    if (sim.drive > driveCap) {
      warnings.push("Driving time exceeds the comfortable limit — consider adding an extra day.");
    }

    const inMonsoon = prefs.month >= 6 && prefs.month <= 9;
    const badges: string[] = [];
    if (stops.every((s) => s.safety >= 0.75))  badges.push("Safe route");
    if (stops.some((s) => s.ghat))              badges.push("Ghat road: daylight only");
    if (inMonsoon && stops.some((s) => s.ghat)) badges.push("Monsoon alert: check road status");

    days.push({
      day: i + 1, date,
      items: sim.items,
      placeIds: stops.map((s) => s.id),
      driveMin: Math.round(sim.drive),
      km: Math.round(sim.km),
      badges,
      warnings: [...warnings, ...sim.warnings],
      overnightAt:  sim.overnightName,
      overnightLat: sim.overnightLat,
      overnightLng: sim.overnightLng,
    });

    anchor         = { lat: sim.overnightLat, lng: sim.overnightLng };
    overnightLabel = sim.overnightName;
  }

  // Return leg km for cost calculation
  const returnKm = roadKm(anchor, END);

  // ── Validation pass ──────────────────────────────────────────────────────
  const validationWarnings = validatePlan(days, prefs.transport);
  const transportSummary   = buildTransportSummary(prefs.transport, days);

  return {
    days,
    cost: costOf(prefs, state, days, returnKm),
    startName: startLoc?.name,
    endName:   endLoc?.name,
    transportSummary,
    validationWarnings,
  };
}

function costOf(
  prefs: Prefs,
  state: State,
  days: Day[],
  returnKm: number,
): CostBreakdown {
  const km = days.reduce((s, d) => s + d.km, 0) + returnKm;
  const rate  = RATE[state.transport];
  const rooms = Math.ceil(prefs.travellers / 2);
  const nights = Math.max(1, days.length - 1);
  const stay  = STAY[state.tier] * rooms * nights;
  const food  = FOOD[state.tier] * prefs.travellers * days.length;
  const vehicles = state.transport === "bike" ? Math.ceil(prefs.travellers / 2) : 1;
  const transport = Math.round(
    rate.per === "person"
      ? rate.perKm * km * prefs.travellers + 150 * days.length
      : rate.perKm * km * vehicles
  );
  const tickets = days.reduce(
    (s, d) => s + d.items.reduce((a, it) => a + (it.kind === "visit" ? it.cost : 0), 0),
    0,
  );
  const sub = stay + food + transport + tickets;
  const contingency = Math.round(sub * 0.1);
  return { stay, food, transport, tickets, contingency, total: sub + contingency };
}

export async function buildPlan(prefs: Prefs, v: Variant): Promise<Plan> {
  const cfg = VARIANTS[v];
  const minSafety = prefs.group === "women" ? Math.max(cfg.minSafety, 0.7) : cfg.minSafety;
  const score = (p: Place) => scorePlace(p, prefs, v);

  let pool = PLACES.filter((p) => !p.avoidMonths.includes(prefs.month) && p.safety >= minSafety);
  if (pool.length < prefs.days) pool = PLACES.filter((p) => !p.avoidMonths.includes(prefs.month));

  const n = prefs.days * (prefs.pace === "relaxed" ? 3 : 4);
  const ids = [...pool].sort((a, b) => score(b) - score(a)).slice(0, n).map((p) => p.id);
  const state: State = { ids, tier: cfg.tier, transport: prefs.transport };
  const changes: string[] = [];
  let r = await assemble(prefs, state, v, score);

  // Budget repair loop
  for (let i = 0; i < 14 && r.cost.total > prefs.budget; i++) {
    if (state.tier === "comfort") {
      state.tier = "standard";
      changes.push("Moved stays from comfort to standard hotels.");
    } else if (state.tier === "standard") {
      state.tier = "budget";
      changes.push("Swapped hotels for budget lodges/homestays.");
    } else if (state.transport !== "bus" && state.transport !== "train") {
      state.transport = "bus";
      changes.push("Switched to KSRTC bus/train for long legs.");
    } else {
      const inPlan = r.days.flatMap((d) => d.placeIds);
      if (inPlan.length <= 1) break;
      const worst = inPlan.map((id) => BY_ID.get(id)!).reduce((a, b) => (score(a) <= score(b) ? a : b));
      state.ids = state.ids.filter((x) => x !== worst.id);
      changes.push(`Removed ${worst.name} (lowest score for your preferences).`);
    }
    r = await assemble(prefs, state, v, score);
  }

  const warnings: string[] = [];

  // Unresolved location warnings
  if (prefs.startPoint && !findLocation(prefs.startPoint)) {
    warnings.push(
      `Start point "${prefs.startPoint}" not found in known cities — defaulted to Bengaluru. ` +
      `Try a major city name like "Mysuru" or "Mangaluru".`
    );
  }
  if (prefs.endPoint && !findLocation(prefs.endPoint)) {
    warnings.push(
      `End point "${prefs.endPoint}" not found in known cities — defaulted to start point.`
    );
  }
  if (r.days.length < prefs.days) {
    warnings.push(
      `Only ${r.days.length} day(s) of matching places found for ${prefs.days} days — ` +
      `add more interests or increase the budget.`
    );
  }
  if (r.cost.total > prefs.budget) {
    warnings.push("Still above budget after all adjustments. Consider fewer days or a larger budget.");
  }
  // Append validation warnings from the transport pass
  warnings.push(...r.validationWarnings);

  const used = new Set(r.days.flatMap((d) => d.placeIds));
  return {
    variant: v,
    tier: state.tier,
    transport: state.transport,
    days: r.days,
    cost: r.cost,
    withinBudget: r.cost.total <= prefs.budget,
    changes,
    warnings,
    places: PLACES.filter((p) => used.has(p.id)),
    startName: r.startName,
    endName: r.endName,
    transportSummary: r.transportSummary,
    priceInfo: {
      source: "seed-estimate",
      note: "Illustrative estimates, not live prices. Verify entry fees, stays and transport before booking.",
    },
  };
}

export const buildPlans = (prefs: Prefs) =>
  Promise.all(
    (["cheapest", "balanced", "safest"] as Variant[]).map((v) => buildPlan(prefs, v))
  );
