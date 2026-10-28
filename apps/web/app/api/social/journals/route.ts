import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  trip_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  tips: z.string().max(2000).optional(),
  steps: z.string().max(4000).optional(),
  spent: z.number().min(0).optional(),
});

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // journals table has no created_at column — order by id DESC
  const { data, error } = await supabase
    .from("journals")
    .select("id, title, tips, steps, spent, user_id, trip_id")
    .order("id", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[journals GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ journals: data ?? [] });
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const body = Body.safeParse(raw);
  if (!body.success) {
    return NextResponse.json({ error: "Bad request", details: body.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { trip_id, title, tips, steps, spent } = body.data;

  // Verify the trip belongs to the authenticated user
  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .select("id")
    .eq("id", trip_id)
    .eq("user_id", user.id)
    .single();

  if (tripErr || !trip) {
    return NextResponse.json({ error: "Trip not found or not owned by you" }, { status: 404 });
  }

  const { data: journal, error: journalErr } = await supabase
    .from("journals")
    .insert({
      user_id: user.id,
      trip_id,
      title,
      tips: tips ?? null,
      steps: steps ?? null,
      spent: spent ?? null,
    })
    .select("id")
    .single();

  if (journalErr || !journal) {
    console.error("[journals POST insert]", journalErr);
    return NextResponse.json({ error: journalErr?.message ?? "Failed to create journal" }, { status: 500 });
  }

  return NextResponse.json({ id: journal.id }, { status: 201 });
}
