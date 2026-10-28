/**
 * Known Karnataka cities and common origin cities outside Karnataka.
 * Used for start/end point autocomplete and geocoding without an external API.
 */
export type KnownLocation = {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
};

export const KNOWN_LOCATIONS: KnownLocation[] = [
  // ── Karnataka ───────────────────────────────────────────────────────────
  { id: "bengaluru",       name: "Bengaluru",         state: "Karnataka",     lat: 12.9716, lng: 77.5946 },
  { id: "mysuru",          name: "Mysuru",             state: "Karnataka",     lat: 12.2958, lng: 76.6394 },
  { id: "hubballi",        name: "Hubballi",           state: "Karnataka",     lat: 15.3647, lng: 75.1240 },
  { id: "mangaluru",       name: "Mangaluru",          state: "Karnataka",     lat: 12.9141, lng: 74.8560 },
  { id: "belagavi",        name: "Belagavi",           state: "Karnataka",     lat: 15.8497, lng: 74.4977 },
  { id: "ballari",         name: "Ballari",            state: "Karnataka",     lat: 15.1394, lng: 76.9214 },
  { id: "vijayapura",      name: "Vijayapura",         state: "Karnataka",     lat: 16.8302, lng: 75.7100 },
  { id: "shivamogga",      name: "Shivamogga",         state: "Karnataka",     lat: 13.9299, lng: 75.5681 },
  { id: "tumakuru",        name: "Tumakuru",           state: "Karnataka",     lat: 13.3379, lng: 77.1173 },
  { id: "davangere",       name: "Davangere",          state: "Karnataka",     lat: 14.4644, lng: 75.9218 },
  { id: "kalaburagi",      name: "Kalaburagi",         state: "Karnataka",     lat: 17.3297, lng: 76.8200 },
  { id: "hassan",          name: "Hassan",             state: "Karnataka",     lat: 13.0068, lng: 76.0996 },
  { id: "udupi",           name: "Udupi",              state: "Karnataka",     lat: 13.3409, lng: 74.7421 },
  { id: "chikkamagaluru",  name: "Chikkamagaluru",     state: "Karnataka",     lat: 13.3153, lng: 75.7754 },
  { id: "madikeri",        name: "Madikeri (Coorg)",   state: "Karnataka",     lat: 12.4202, lng: 75.7380 },
  { id: "hampi",           name: "Hampi",              state: "Karnataka",     lat: 15.3350, lng: 76.4600 },
  { id: "badami",          name: "Badami",             state: "Karnataka",     lat: 15.9186, lng: 75.6801 },
  { id: "hospet",          name: "Hospet",             state: "Karnataka",     lat: 15.2689, lng: 76.3909 },
  { id: "bidar",           name: "Bidar",              state: "Karnataka",     lat: 17.9140, lng: 77.5180 },
  { id: "raichur",         name: "Raichur",            state: "Karnataka",     lat: 16.2076, lng: 77.3463 },
  { id: "koppal",          name: "Koppal",             state: "Karnataka",     lat: 15.3508, lng: 76.1547 },
  { id: "gadag",           name: "Gadag",              state: "Karnataka",     lat: 15.4288, lng: 75.6328 },
  { id: "karwar",          name: "Karwar",             state: "Karnataka",     lat: 14.8013, lng: 74.1288 },
  { id: "gokarna",         name: "Gokarna",            state: "Karnataka",     lat: 14.5483, lng: 74.3188 },
  { id: "murudeshwar",     name: "Murudeshwar",        state: "Karnataka",     lat: 14.0944, lng: 74.4850 },
  { id: "kabini",          name: "Kabini",             state: "Karnataka",     lat: 11.9836, lng: 76.3574 },
  { id: "nandi-hills",     name: "Nandi Hills",        state: "Karnataka",     lat: 13.3702, lng: 77.6835 },
  // ── Neighbouring states (common trip origins) ────────────────────────────
  { id: "chennai",         name: "Chennai",            state: "Tamil Nadu",    lat: 13.0827, lng: 80.2707 },
  { id: "hyderabad",       name: "Hyderabad",          state: "Telangana",     lat: 17.3850, lng: 78.4867 },
  { id: "mumbai",          name: "Mumbai",             state: "Maharashtra",   lat: 19.0760, lng: 72.8777 },
  { id: "pune",            name: "Pune",               state: "Maharashtra",   lat: 18.5204, lng: 73.8567 },
  { id: "goa-panaji",      name: "Panaji (Goa)",       state: "Goa",           lat: 15.4909, lng: 73.8278 },
  { id: "kochi",           name: "Kochi",              state: "Kerala",        lat:  9.9312, lng: 76.2673 },
  { id: "coimbatore",      name: "Coimbatore",         state: "Tamil Nadu",    lat: 11.0168, lng: 76.9558 },
  { id: "tiruchirappalli", name: "Tiruchirappalli",    state: "Tamil Nadu",    lat: 10.7905, lng: 78.7047 },
  { id: "kolkata",         name: "Kolkata",            state: "West Bengal",   lat: 22.5726, lng: 88.3639 },
  { id: "delhi",           name: "New Delhi",          state: "Delhi",         lat: 28.6139, lng: 77.2090 },
];

/** Find best-matching location by partial name (case-insensitive). */
export function findLocation(query: string): KnownLocation | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  // Exact match first
  const exact = KNOWN_LOCATIONS.find((l) => l.name.toLowerCase() === q || l.id === q);
  if (exact) return exact;
  // Starts-with match
  const starts = KNOWN_LOCATIONS.find((l) => l.name.toLowerCase().startsWith(q));
  if (starts) return starts;
  // Contains match
  return KNOWN_LOCATIONS.find((l) => l.name.toLowerCase().includes(q));
}

/** Autocomplete: returns up to `limit` matches for a query string. */
export function autocompleteLocations(query: string, limit = 6): KnownLocation[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  return KNOWN_LOCATIONS
    .filter((l) =>
      l.name.toLowerCase().includes(q) ||
      l.state.toLowerCase().includes(q) ||
      l.id.includes(q)
    )
    .slice(0, limit);
}
