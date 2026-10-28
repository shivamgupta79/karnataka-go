/**
 * PrintMap — a pure SVG route map rendered server-side / without WebGL.
 * Used in the print layout so maplibre-gl (which won't render in print) is bypassed.
 *
 * Draws a dot-connected route with numbered stop circles, one colour per day.
 */
import type { Plan, Place } from "@/lib/types";

const DAY_COLORS = [
  "#1a6b47", "#d97706", "#0369a1", "#be123c", "#7c3aed",
  "#0891b2", "#15803d", "#b45309", "#9333ea", "#0f766e",
];

const W = 740;   // SVG viewport width  (pts)
const H = 420;   // SVG viewport height (pts)
const PAD = 44;  // padding inside viewport

function project(
  lat: number, lng: number,
  minLat: number, maxLat: number,
  minLng: number, maxLng: number,
): [number, number] {
  const x = PAD + ((lng - minLng) / (maxLng - minLng || 1)) * (W - PAD * 2);
  // SVG y increases downward; latitude increases upward — flip it
  const y = PAD + ((maxLat - lat) / (maxLat - minLat || 1)) * (H - PAD * 2);
  return [x, y];
}

export default function PrintMap({ plan }: { plan: Plan }) {
  if (!plan.places.length) return null;

  const lats = plan.places.map((p) => p.lat);
  const lngs = plan.places.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Expand bounding box slightly so edge markers don't clip
  const dLat = (maxLat - minLat) * 0.12 || 0.3;
  const dLng = (maxLng - minLng) * 0.12 || 0.3;
  const bMinLat = minLat - dLat, bMaxLat = maxLat + dLat;
  const bMinLng = minLng - dLng, bMaxLng = maxLng + dLng;

  const byId = new Map(plan.places.map((p) => [p.id, p]));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: "block", borderRadius: 8, border: "1px solid #d6ccb8", background: "#f8f5ee" }}
      aria-label="Trip route map"
    >
      {/* Light grid lines */}
      {[0.25, 0.5, 0.75].map((t) => (
        <g key={t}>
          <line
            x1={PAD + t * (W - PAD * 2)} y1={PAD}
            x2={PAD + t * (W - PAD * 2)} y2={H - PAD}
            stroke="#e0d8c8" strokeWidth="1"
          />
          <line
            x1={PAD} y1={PAD + t * (H - PAD * 2)}
            x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
            stroke="#e0d8c8" strokeWidth="1"
          />
        </g>
      ))}

      {/* Draw day routes */}
      {plan.days.map((day, di) => {
        const color = DAY_COLORS[di % DAY_COLORS.length];
        const stops = day.placeIds.map((id) => byId.get(id)).filter(Boolean) as Place[];
        if (stops.length < 2) return null;
        const pts = stops.map((s) => project(s.lat, s.lng, bMinLat, bMaxLat, bMinLng, bMaxLng));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
        return (
          <g key={day.day}>
            {/* Shadow */}
            <path d={d} fill="none" stroke="#00000020" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
            {/* Route line */}
            <path d={d} fill="none" stroke={color} strokeWidth="2.5"
              strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}

      {/* Draw stop markers */}
      {plan.days.map((day, di) => {
        const color = DAY_COLORS[di % DAY_COLORS.length];
        const stops = day.placeIds.map((id) => byId.get(id)).filter(Boolean) as Place[];
        return stops.map((s, si) => {
          const [x, y] = project(s.lat, s.lng, bMinLat, bMaxLat, bMinLng, bMaxLng);
          const label = String(si + 1);
          return (
            <g key={s.id}>
              <circle cx={x} cy={y} r={12} fill={color} stroke="#fff" strokeWidth="2" />
              <text
                x={x} y={y + 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
                fill="#fff"
              >
                {label}
              </text>
              {/* Place name label — offset above/below alternating to avoid overlap */}
              <text
                x={x} y={si % 2 === 0 ? y - 16 : y + 24}
                textAnchor="middle"
                fontSize="7.5"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
                fill={color}
              >
                {s.name.length > 16 ? s.name.slice(0, 14) + "…" : s.name}
              </text>
            </g>
          );
        });
      })}

      {/* Legend — day colour swatches */}
      {plan.days.map((day, di) => {
        const color = DAY_COLORS[di % DAY_COLORS.length];
        const x = PAD + di * 80;
        if (x > W - PAD - 60) return null; // don't overflow
        return (
          <g key={day.day}>
            <rect x={x} y={H - PAD + 10} width={14} height={10} rx={3} fill={color} />
            <text
              x={x + 18} y={H - PAD + 19}
              fontSize="8" fontFamily="system-ui, sans-serif" fill="#555"
            >
              Day {day.day}{day.date ? ` · ${day.date}` : ""}
            </text>
          </g>
        );
      })}

      {/* Compass rose */}
      <text x={W - PAD + 6} y={PAD + 4} fontSize="11" fontFamily="system-ui" fill="#999">N↑</text>
    </svg>
  );
}
