import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const MuteBody = z.object({
  muted_id: z.string().uuid(),
  hours: z.number().int().positive().optional(),
});

const UnmuteBody = z.object({
  muted_id: z.string().uuid(),
});

// ── GET — return current user's muted_ids ─────────────────────────────────
export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_mutes")
    .select("muted_id, muted_until")
    .eq("muter_id", user.id);

  if (error) {
    console.error("[mute GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out expired mutes
  const now = Date.now();
  const muted_ids = (data ?? [])
    .filter((r) => !r.muted_until || new Date(r.muted_until as string).getTime() > now)
    .map((r) => r.muted_id as string);

  return NextResponse.json({ muted_ids });
}

// ── POST — mute a user ────────────────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = MuteBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { muted_id, hours } = parsed.data;

  if (muted_id === user.id) {
    return NextResponse.json({ error: "Cannot mute yourself" }, { status: 400 });
  }

  const muted_until = hours
    ? new Date(Date.now() + hours * 3_600_000).toISOString()
    : null;

  const { error } = await supabase
    .from("user_mutes")
    .upsert(
      { muter_id: user.id, muted_id, muted_until },
      { onConflict: "muter_id,muted_id" }
    );

  if (error) {
    console.error("[mute POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE — unmute a user ────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = UnmuteBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { muted_id } = parsed.data;

  const { error } = await supabase
    .from("user_mutes")
    .delete()
    .eq("muter_id", user.id)
    .eq("muted_id", muted_id);

  if (error) {
    console.error("[mute DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
