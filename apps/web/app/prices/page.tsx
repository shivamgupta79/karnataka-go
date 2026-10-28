"use client";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import PriceCard from "@/components/PriceCard";
import placesData from "@/data/places.json";
import staysData from "@/data/stays.json";

// Sample data slices for the community dashboard
const SAMPLE_PLACES  = (placesData as Array<{ id: string; name: string }>).slice(0, 6);
const SAMPLE_STAYS   = (staysData  as Array<{ id: string; label: string }>).slice(0, 4);

const TRANSPORT_SAMPLES = [
  { id: "ksrtc-bangalore-mysore", label: "KSRTC Bengaluru → Mysuru (Airavata)" },
  { id: "train-ypr-ubl",          label: "Train Bengaluru → Hubballi (Hampi Express)" },
  { id: "taxi-bangalore-coorg",   label: "Taxi Bengaluru → Coorg" },
  { id: "bus-hampi-hospet",       label: "Local bus Hampi → Hospet" },
];

const RESTAURANT_SAMPLES = [
  { id: "rest-mylari-mysuru",      label: "Mylari Hotel, Mysuru (Dosa)" },
  { id: "rest-kamath-udupi",       label: "Kamath Bugle Rock, Bengaluru" },
  { id: "rest-central-tiffins",    label: "Central Tiffins, Hampi area" },
  { id: "rest-shetty-udupi",       label: "Shetty Lunch Home, Udupi" },
];

export default function PricesPage() {
  const { user, loading, configured } = useAuth();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4"
          style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // ── Auth not configured ──────────────────────────────────────────────────
  if (!configured) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
        <p className="text-4xl">🔧</p>
        <h1 className="text-xl font-bold">Auth not configured</h1>
        <p className="text-sm opacity-60 leading-relaxed">
          Add Supabase credentials to{" "}
          <code className="font-mono bg-black/10 px-1 rounded">.env.local</code> to enable live prices.
        </p>
        <Link href="/" className="text-sm underline opacity-50">← Back to planner</Link>
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold">Sign in to see community prices</h1>
        <p className="text-sm opacity-60">
          Prices are crowdsourced by verified travellers. Sign in to contribute.
        </p>
        <Link
          href="/auth"
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}
        >
          Sign in or sign up →
        </Link>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-10">
      {/* Header */}
      <div>
        <Link href="/" className="text-sm opacity-50 hover:opacity-75 transition-opacity">← Planner</Link>
        <h1 className="text-2xl font-extrabold mt-1" style={{ color: "var(--color-forest)" }}>
          💰 Community Prices
        </h1>
        <p className="text-sm opacity-60 mt-1">
          Live prices submitted by verified travellers. Bargain prices show what people actually paid.
        </p>
      </div>

      {/* Entry Fees section */}
      <section>
        <h2 className="section-label">🏛 Entry Fees</h2>
        <p className="text-xs opacity-55 mb-3">
          Ticket prices for Karnataka&apos;s heritage sites, temples, and wildlife parks.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_PLACES.map((place) => (
            <PriceCard
              key={place.id}
              entityType="place"
              entityId={place.id}
              label={place.name}
            />
          ))}
        </div>
      </section>

      {/* Stays section */}
      <section>
        <h2 className="section-label">🏨 Stays</h2>
        <p className="text-xs opacity-55 mb-3">
          Per-night prices for hotels, homestays, and lodges across Karnataka.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SAMPLE_STAYS.map((stay) => (
            <PriceCard
              key={stay.id}
              entityType="stay"
              entityId={stay.id}
              label={stay.label}
            />
          ))}
        </div>
      </section>

      {/* Food section */}
      <section>
        <h2 className="section-label">🍽 Food &amp; Restaurants</h2>
        <p className="text-xs opacity-55 mb-3">
          Average meal costs at popular eateries. Help others plan their food budget.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {RESTAURANT_SAMPLES.map((r) => (
            <PriceCard
              key={r.id}
              entityType="restaurant"
              entityId={r.id}
              label={r.label}
            />
          ))}
        </div>
      </section>

      {/* Transport section */}
      <section>
        <h2 className="section-label">🚌 Transport</h2>
        <p className="text-xs opacity-55 mb-3">
          Bus, train, and taxi fares for common Karnataka routes.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {TRANSPORT_SAMPLES.map((t) => (
            <PriceCard
              key={t.id}
              entityType="transport"
              entityId={t.id}
              label={t.label}
            />
          ))}
        </div>
      </section>

      {/* Your submissions note */}
      <section>
        <div
          className="card p-5 text-sm space-y-2"
          style={{ borderLeft: "4px solid var(--color-forest)" }}
        >
          <p className="font-semibold" style={{ color: "var(--color-forest)" }}>
            📋 Your Submitted Prices
          </p>
          <p className="opacity-65 leading-relaxed">
            Prices you submit appear here after approval by the moderation team.
            To submit a price, click <strong>&quot;📤 Submit price update&quot;</strong> on any card above.
          </p>
          <p className="opacity-50 text-xs">
            Only verified travellers can submit prices.{" "}
            <Link href="/profile" className="underline" style={{ color: "var(--color-forest)" }}>
              Verify your documents in your profile →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
