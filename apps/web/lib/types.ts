export type Place = {
  id: string; name: string; region: string; lat: number; lng: number;
  category: string[]; fee: number; hours: string; closedDay: number | null;
  visitMin: number; bestMonths: number[]; avoidMonths: number[];
  safety: number; crowd: number; rating: number; uniqueness: number; ghat: boolean;
  history: string; photoTip: string; source: string;
};
export type Transport = "car" | "bike" | "bus" | "train" | "taxi" | "mix";
export type Group = "solo" | "couple" | "family" | "friends" | "women";
export type Prefs = {
  days: number; budget: number; travellers: number; interests: string[];
  group: Group; pace: "relaxed" | "packed"; transport: Transport;
  month: number; startDate?: string; language: string;
  /** Optional free-text name of the trip start city/town. */
  startPoint?: string;
  /** Optional free-text name of the trip end city/town (defaults to startPoint if omitted). */
  endPoint?: string;
};
export type Variant = "cheapest" | "balanced" | "safest";
export type Tier = "budget" | "standard" | "comfort";
export type TimelineItem = {
  start: string; end: string;
  kind: "drive" | "visit" | "meal" | "stay" | "fuel" | "vehicle_change" | "rest" | "ghat_warning" | "rental" | "transit_info";
  title: string; placeId?: string; cost: number; note?: string;
  /** Approximate lat/lng for map pin — set for all non-drive items */
  lat?: number; lng?: number;
  /** Extra detail shown in the map popup */
  detail?: string;
  /** Which transport mode generated this item (especially useful for mix) */
  transportMode?: Transport;
  /** true when this fuel item is a remote-stretch warning */
  fuelWarning?: boolean;
  /** Human-readable rental instructions (bike mode) */
  rentalInfo?: string;
  /** Booking tip / frequency note for bus or train legs */
  transitInfo?: string;
};
export type Day = {
  day: number; date?: string; items: TimelineItem[]; placeIds: string[];
  driveMin: number; km: number; badges: string[]; warnings: string[];
  /** Name of the place/town where the traveller stays overnight — becomes next day's depart label. */
  overnightAt: string;
  /** Coords of the overnight stay — used as the next day's anchor. */
  overnightLat: number;
  overnightLng: number;
};
export type CostBreakdown = {
  stay: number; food: number; transport: number; tickets: number;
  contingency: number; total: number;
};
export type Plan = {
  variant: Variant; tier: Tier; transport: Transport; days: Day[];
  cost: CostBreakdown; withinBudget: boolean; changes: string[]; warnings: string[];
  places: Place[];
  /** Resolved name of the trip's starting city (undefined = defaulted to Bengaluru). */
  startName?: string;
  /** Resolved name of the trip's ending city (undefined = same as start). */
  endName?: string;
  /** Human-readable transport summary banner shown in the itinerary. */
  transportSummary?: string;
  priceInfo: { source: string; note: string };
};
export type ChecklistGroup = { title: string; items: string[] };
