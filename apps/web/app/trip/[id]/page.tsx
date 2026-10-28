import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import Link from "next/link";
import type { Plan } from "@/lib/types";
import { SharedTripView } from "@/components/SharedTripView";

export default async function SharedTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Supabase not configured — can't look up trip
  if (!supabaseConfigured) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-3xl">🔧</p>
        <h1 className="text-xl font-bold">Shared trips not available</h1>
        <p className="text-sm opacity-60 max-w-xs">
          Add <code className="font-mono bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="font-mono bg-gray-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          to <code className="font-mono bg-gray-100 px-1 rounded">.env.local</code> to enable this feature.
        </p>
        <Link href="/" className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}>
          Plan a trip →
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase!
    .from("trips")
    .select("id, days, budget, preferences, status")
    .eq("id", id)
    .single();

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-3xl">🗺️</p>
        <h1 className="text-xl font-bold">Trip not found</h1>
        <p className="text-sm opacity-60">This link may have expired or been removed.</p>
        <Link href="/" className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}>
          Plan your own trip →
        </Link>
      </div>
    );
  }

  const plan = data.preferences?.plan as Plan | undefined;
  if (!plan) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-xl font-bold">Trip data unavailable</h1>
        <Link href="/" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}>← Plan a trip</Link>
      </div>
    );
  }

  const title = (data.preferences?.title as string | undefined) ?? `Karnataka ${data.days}-day trip`;
  return <SharedTripView plan={plan} title={title} tripId={id} />;
}
