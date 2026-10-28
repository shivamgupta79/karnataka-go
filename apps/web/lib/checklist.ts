import type { ChecklistGroup, Place, Prefs } from "./types";

export function buildChecklist(prefs: Prefs, places: Place[]): ChecklistGroup[] {
  const cats = new Set(places.flatMap((p) => p.category));
  const monsoon = prefs.month >= 6 && prefs.month <= 9;
  const ghat = places.some((p) => p.ghat);
  const docs = ["Photo ID", "Tickets and bookings (offline copy)", "Travel insurance"];
  if (cats.has("wildlife")) docs.push("Forest safari booking confirmation / permit");
  const clothing = ["Comfortable walking shoes"];
  if (monsoon && ghat) clothing.push("Rain gear");
  if (cats.has("temples") || cats.has("spiritual")) clothing.push("Modest clothes for temples");
  if (cats.has("beaches")) clothing.push("Swimwear and quick-dry towel");
  const health = ["Personal medicines", "First-aid kit", "ORS sachets", "Sunscreen"];
  if (cats.has("wildlife") || cats.has("nature")) health.push("Mosquito repellent");
  if (monsoon && cats.has("adventure")) health.push("Leech socks (monsoon treks)");
  if (prefs.group === "family") health.push("Children's / elders' regular medicines");
  return [
    { title: "Documents", items: docs },
    { title: "Clothing", items: clothing },
    { title: "Health", items: health },
    { title: "Tech", items: ["Power bank", "Offline maps downloaded", "Charger"] },
    { title: "Cash", items: ["Small notes for remote places and temple offerings"] },
  ];
}
