import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const BlockBody = z.object({
  blocked_id: z.string().uuid(),
});

// ── GET — return current user's blocked_ids ───────────────────────────────
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
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id);

  if (error) {
    console.error("[block GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const blocked_ids = (data ?? []).map((r) => r.blocked_id as string);
  return NextResponse.json({ blocked_ids });
}

// ── POST — block a user ───────────────────────────────────────────────────
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
  const parsed = BlockBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { blocked_id } = parsed.data;

  if (blocked_id === user.id) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_blocks")
    .upsert({ blocker_id: user.id, blocked_id }, { onConflict: "blocker_id,blocked_id" });

  if (error) {
    console.error("[block POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── DELETE — unblock a user ───────────────────────────────────────────────
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
  const parsed = BlockBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { blocked_id } = parsed.data;

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blocked_id);

  if (error) {
    console.error("[block DELETE]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
