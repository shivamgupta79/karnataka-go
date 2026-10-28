"use client";
import type { Prefs } from "@/lib/types";
import { TRANSPORT_META, type TransportMode } from "./VehicleIcons";
import LocationInput from "./LocationInput";

// ── Interest definitions ──────────────────────────────────────────────────────
// Each interest maps exactly to the "category" field in places.json
// so the scoring pipeline picks up matching places automatically.

export type InterestMeta = {
  id: string;
  label: string;
  emoji: string;
  desc: string;        // shown as tooltip / subtitle
  group: string;       // visual grouping header
};

export const INTEREST_GROUPS: { title: string; items: InterestMeta[] }[] = [
  {
    title: "History & Culture",
    items: [
      { id: "heritage",   label: "Heritage",      emoji: "🏛",  desc: "Palaces, Hoysala temples, Vijayanagara ruins",           group: "History & Culture" },
      { id: "temples",    label: "Temples",        emoji: "⛩",  desc: "Living shrines from Chamundi to Udupi Krishna Matha",    group: "History & Culture" },
      { id: "forts",      label: "Forts",          emoji: "🏰",  desc: "Chitradurga, Bidar, Srirangapatna fortifications",       group: "History & Culture" },
      { id: "ruins",      label: "Ruins",          emoji: "🗿",  desc: "Hampi, Pattadakal, Aihole archaeological sites",         group: "History & Culture" },
      { id: "sculpture",  label: "Sculpture",      emoji: "🪨",  desc: "Hoysala carvings, Chalukya friezes, Gommateshwara",      group: "History & Culture" },
      { id: "royal",      label: "Royal Heritage", emoji: "👑",  desc: "Wadiyar palaces, Dasara procession, Coorg royalty",      group: "History & Culture" },
    ],
  },
  {
    title: "Nature & Adventure",
    items: [
      { id: "nature",     label: "Nature",         emoji: "🌿",  desc: "Western Ghats, coffee hills, backwaters",                group: "Nature & Adventure" },
      { id: "trekking",   label: "Trekking",       emoji: "🥾",  desc: "Mullayanagiri, Kudremukh, Bisle forest peaks",           group: "Nature & Adventure" },
      { id: "adventure",  label: "Adventure",      emoji: "🧗",  desc: "Rock climbing, river rafting, zip-lining in Dandeli",    group: "Nature & Adventure" },
      { id: "waterfalls", label: "Waterfalls",      emoji: "💧",  desc: "Jog Falls, Abbey Falls, Magod Falls, Hebbe Falls",       group: "Nature & Adventure" },
      { id: "caves",      label: "Caves",           emoji: "🦇",  desc: "Yana crystalline rocks, Belum cave system",              group: "Nature & Adventure" },
      { id: "geology",    label: "Geology",         emoji: "🪨",  desc: "St. Mary's basalt columns, Deccan lava landscapes",      group: "Nature & Adventure" },
    ],
  },
  {
    title: "Wildlife & Birding",
    items: [
      { id: "wildlife",      label: "Wildlife",      emoji: "🐘",  desc: "Tigers, elephants — Kabini, Bandipur, Nagarhole",        group: "Wildlife & Birding" },
      { id: "birdwatching",  label: "Bird Watching", emoji: "🦜",  desc: "300+ species — Dandeli, Ranganathittu, Agumbe",          group: "Wildlife & Birding" },
    ],
  },
  {
    title: "Beaches & Coast",
    items: [
      { id: "beaches",      label: "Beaches",        emoji: "🏖",  desc: "Gokarna, Maravanthe, Murudeshwar, St. Mary's Islands",  group: "Beaches & Coast" },
      { id: "backpacking",  label: "Backpacking",    emoji: "🎒",  desc: "Gokarna beach-hop, budget Hampi, Hampi bouldering",      group: "Beaches & Coast" },
    ],
  },
  {
    title: "Spiritual & Wellness",
    items: [
      { id: "spiritual",  label: "Spiritual",      emoji: "🕯",  desc: "Pilgrimage — Dharmasthala, Udupi, Shravanabelagola",     group: "Spiritual & Wellness" },
      { id: "yoga",       label: "Yoga & Wellness",emoji: "🧘",  desc: "Ashrams in Mysuru, wellness retreats in Coorg",          group: "Spiritual & Wellness" },
    ],
  },
  {
    title: "Food & Coffee",
    items: [
      { id: "food",    label: "Food",            emoji: "🍛",  desc: "Udupi thali, Coorgi pandi curry, Bisi bele bath",         group: "Food & Coffee" },
      { id: "coffee",  label: "Coffee Trails",   emoji: "☕",  desc: "Estate walks — Coorg & Chikkamagaluru plantations",       group: "Food & Coffee" },
      { id: "rural",   label: "Rural Life",      emoji: "🌾",  desc: "Village homestays, paddy fields, spice garden walks",     group: "Food & Coffee" },
    ],
  },
  {
    title: "Arts, Culture & Festivals",
    items: [
      { id: "folk-arts",  label: "Folk Arts",      emoji: "🎭",  desc: "Yakshagana, Dollu Kunitha drum dance, Kamsale",          group: "Arts, Culture & Festivals" },
      { id: "festivals",  label: "Festivals",      emoji: "🎆",  desc: "Dasara (Oct), Hampi Utsav (Nov), Pattadakal Dance (Jan)", group: "Arts, Culture & Festivals" },
      { id: "culture",    label: "Culture",        emoji: "🎨",  desc: "Mysore painting, Channapatna toys, Bidri craft",         group: "Arts, Culture & Festivals" },
      { id: "tribal",     label: "Tribal Life",    emoji: "🪘",  desc: "Lambani embroidery, Soliga tribes, Jenu Kuruba culture", group: "Arts, Culture & Festivals" },
    ],
  },
  {
    title: "Photography & Experiences",
    items: [
      { id: "photography",  label: "Photography",   emoji: "📷",  desc: "Hampi boulders, Coorg mist, Murudeshwar sunset",         group: "Photography & Experiences" },
      { id: "museums",      label: "Museums",        emoji: "🏺",  desc: "Mysuru palace museum, Dharmasthala, Folk Arts Museum",   group: "Photography & Experiences" },
      { id: "shopping",     label: "Shopping",       emoji: "🛍",  desc: "Mysore silk, sandalwood, Channapatna toys",              group: "Photography & Experiences" },
    ],
  },
];

// Flat list for the scoring engine and schema validation
export const INTERESTS = INTEREST_GROUPS.flatMap((g) => g.items.map((i) => i.id));

// Quick lookup maps
export const INTEREST_META: Record<string, InterestMeta> = Object.fromEntries(
  INTEREST_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i]))
);

// ─────────────────────────────────────────────────────────────────────────────

export const LANGUAGES = [
  "English", "ಕನ್ನಡ (Kannada)", "हिन्दी (Hindi)",
  "தமிழ் (Tamil)", "తెలుగు (Telugu)", "മലയാളം (Malayalam)",
];

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i).toLocaleString("en", { month: "long" })
);

const GROUP_META: Record<string, { icon: string; label: string }> = {
  solo:    { icon: "🧍", label: "Solo"    },
  couple:  { icon: "👫", label: "Couple"  },
  family:  { icon: "👨‍👩‍👧", label: "Family"  },
  friends: { icon: "👯", label: "Friends" },
  women:   { icon: "👩‍🤝‍👩", label: "Women"   },
};

export default function PlannerForm({
  prefs, setPrefs, onSubmit, loading,
}: {
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) =>
    setPrefs({ ...prefs, [k]: v });

  function toggleInterest(id: string) {
    const on = prefs.interests.includes(id);
    set("interests", on
      ? prefs.interests.filter((x) => x !== id)
      : [...prefs.interests, id]
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
      className="card p-6 space-y-7"
    >

      {/* ══ Route endpoints ══ */}
      <div>
        <p className="section-label">
          Route endpoints{" "}
          <span className="font-normal opacity-55 normal-case">(optional — defaults to Bengaluru)</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <LocationInput
            label="Start from"
            icon="🟢"
            placeholder="e.g. Bengaluru, Mysuru, Chennai…"
            value={prefs.startPoint ?? ""}
            onChange={(v) => setPrefs({ ...prefs, startPoint: v || undefined })}
          />
          <LocationInput
            label="End at"
            icon="🔴"
            placeholder="Leave blank to return to start"
            value={prefs.endPoint ?? ""}
            onChange={(v) => setPrefs({ ...prefs, endPoint: v || undefined })}
          />
        </div>
        {(prefs.startPoint || prefs.endPoint) && (
          <div className="mt-2 flex items-center gap-2 text-xs opacity-65">
            <span>🟢</span>
            <span className="font-medium">{prefs.startPoint || "Bengaluru"}</span>
            <span className="flex-1 border-t border-dashed" style={{ borderColor: "var(--color-forest)", opacity: 0.4 }} />
            <span className="opacity-50 text-[10px] italic">stops in between</span>
            <span className="flex-1 border-t border-dashed" style={{ borderColor: "var(--color-silk)", opacity: 0.4 }} />
            <span className="font-medium">{prefs.endPoint || prefs.startPoint || "Bengaluru"}</span>
            <span>🔴</span>
          </div>
        )}
      </div>

      {/* ══ Trip basics ══ */}
      <div>
        <p className="section-label">Trip basics</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="form-label">
            <span>📅 Days</span>
            <input type="number" min={1} max={10} className="field" value={prefs.days}
              onChange={(e) => set("days", +e.target.value)} />
          </label>
          <label className="form-label">
            <span>💰 Total budget (₹)</span>
            <input type="number" min={1000} step={500} className="field" value={prefs.budget}
              onChange={(e) => set("budget", +e.target.value)} />
          </label>
          <label className="form-label">
            <span>👥 Travellers</span>
            <input type="number" min={1} max={12} className="field" value={prefs.travellers}
              onChange={(e) => set("travellers", +e.target.value)} />
          </label>
        </div>
      </div>

      {/* ══ Travel style ══ */}
      <div>
        <p className="section-label">Travel style</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="form-label">
            <span>📅 Start date (optional)</span>
            <input type="date" className="field" value={prefs.startDate ?? ""}
              onChange={(e) => setPrefs({
                ...prefs,
                startDate: e.target.value || undefined,
                month: e.target.value ? new Date(e.target.value).getMonth() + 1 : prefs.month,
              })} />
          </label>
          <label className="form-label">
            <span>🗓 Month of travel</span>
            <select className="field" value={prefs.month} onChange={(e) => set("month", +e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label className="form-label">
            <span>⚡ Pace</span>
            <div className="grid grid-cols-2 gap-2 mt-0.5">
              {(["relaxed", "packed"] as const).map((p) => (
                <button type="button" key={p}
                  onClick={() => set("pace", p)}
                  className="pace-btn"
                  data-active={prefs.pace === p ? "true" : "false"}>
                  {p === "relaxed" ? "😌 Relaxed" : "⚡ Packed"}
                </button>
              ))}
            </div>
          </label>
        </div>
      </div>

      {/* ══ Travelling as ══ */}
      <div>
        <p className="section-label">Travelling as</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(GROUP_META).map(([key, { icon, label }]) => (
            <button type="button" key={key}
              onClick={() => set("group", key as Prefs["group"])}
              className="group-btn"
              data-active={prefs.group === key ? "true" : "false"}>
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-xs font-semibold mt-0.5">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ Transport ══ */}
      <div>
        <p className="section-label">Transport</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(TRANSPORT_META) as TransportMode[]).map((mode) => {
            const { label, desc, icon } = TRANSPORT_META[mode];
            return (
              <button type="button" key={mode}
                onClick={() => set("transport", mode)}
                title={desc}
                className="transport-btn"
                data-active={prefs.transport === mode ? "true" : "false"}>
                <span className="transport-icon">{icon}</span>
                <span className="text-xs font-semibold mt-1 leading-tight">{label}</span>
                <span className="text-[10px] opacity-60 leading-tight hidden sm:block">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ Interests — grouped ══ */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="section-label mb-0">What do you want to experience?</p>
          {prefs.interests.length > 0 && (
            <button type="button"
              onClick={() => set("interests", [])}
              className="text-xs opacity-50 hover:opacity-100 underline transition-opacity">
              Clear all
            </button>
          )}
        </div>

        {/* Selected summary */}
        {prefs.interests.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5 rounded-xl p-2.5"
            style={{ background: "rgba(26,107,71,0.07)", border: "1px solid rgba(26,107,71,0.15)" }}>
            <span className="text-xs font-semibold opacity-60 self-center mr-1">Selected:</span>
            {prefs.interests.map((id) => {
              const m = INTEREST_META[id];
              return (
                <button key={id} type="button"
                  onClick={() => toggleInterest(id)}
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ background: "var(--color-forest)" }}
                  title="Click to remove">
                  {m?.emoji} {m?.label ?? id} ×
                </button>
              );
            })}
          </div>
        )}

        {/* Grouped interest pills */}
        <div className="space-y-4">
          {INTEREST_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-45 mb-2">
                {group.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const on = prefs.interests.includes(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={on}
                      onClick={() => toggleInterest(item.id)}
                      title={item.desc}
                      className="interest-btn"
                      data-active={on ? "true" : "false"}>
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ Language ══ */}
      <div>
        <p className="section-label">AI notes language</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LANGUAGES.map((l) => (
            <button type="button" key={l}
              onClick={() => set("language", l)}
              className="lang-btn"
              data-active={prefs.language === l ? "true" : "false"}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ══ Submit ══ */}
      <button type="submit" disabled={loading} className="submit-btn">
        {loading
          ? <><span className="inline-block animate-spin mr-2">⏳</span>Planning your trip…</>
          : <>🗺&nbsp;&nbsp;Plan my Karnataka trip</>
        }
      </button>
    </form>
  );
}
