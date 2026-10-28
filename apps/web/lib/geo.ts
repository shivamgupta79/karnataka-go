import type { Transport } from "./types";

export type LL = { lat: number; lng: number };
const rad = (x: number) => (x * Math.PI) / 180;

export function haversine(a: LL, b: LL): number {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
/** Straight line -> rough road distance. Replace with OSRM/ORS matrix in production. */
export const roadKm = (a: LL, b: LL) => haversine(a, b) * 1.35;

export function driveMinutes(km: number, transport: Transport, ghat: boolean): number {
  const speed = ghat ? 32 : 45; // km/h
  const mult = transport === "bus" || transport === "train" ? 1.4 : transport === "mix" ? 1.2 : 1;
  return (km / speed) * 60 * mult;
}

export function centroid(pts: LL[]): LL {
  return { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length };
}

export function nearestOrder<T extends LL>(start: LL, pts: T[]): T[] {
  const rem = [...pts], out: T[] = [];
  let cur = start;
  while (rem.length) {
    let bi = 0, bd = Infinity;
    rem.forEach((p, i) => { const d = haversine(cur, p); if (d < bd) { bd = d; bi = i; } });
    const [p] = rem.splice(bi, 1);
    out.push(p); cur = p;
  }
  return out;
}

/** Small deterministic k-means on lat/lng (Karnataka is mostly north-south, so init sorted by latitude). */
export function kmeans<T extends LL>(pts: T[], k: number, iters = 25): T[][] {
  if (k <= 1 || pts.length <= 1) return [pts];
  const sorted = [...pts].sort((a, b) => a.lat - b.lat);
  let cent: LL[] = Array.from({ length: k }, (_, i) => {
    const p = sorted[Math.min(sorted.length - 1, Math.floor(((i + 0.5) * sorted.length) / k))];
    return { lat: p.lat, lng: p.lng };
  });
  let groups: T[][] = [];
  for (let it = 0; it < iters; it++) {
    groups = Array.from({ length: k }, () => [] as T[]);
    for (const p of pts) {
      let bi = 0, bd = Infinity;
      cent.forEach((c, i) => { const d = haversine(c, p); if (d < bd) { bd = d; bi = i; } });
      groups[bi].push(p);
    }
    cent = cent.map((c, i) => (groups[i].length ? centroid(groups[i]) : c));
  }
  return groups.filter((g) => g.length);
}
