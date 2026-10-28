// POST /api/sos  — records an SOS event and notifies the admin dashboard
// via Supabase realtime (insert into sos_events table).
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";

const Body = z.object({
  lat:     z.number().optional(),
  lng:     z.number().optional(),
  message: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  // Rate limit: max 5 SOS per minute per IP (prevent spam)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`sos:${ip}`, { windowMs: 60_000, max: 5 });
  if (!rl.ok)
    return NextResponse.json({ error: rl.message }, { status: 429 });

  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();

  const raw = await req.json().catch(() => ({}));
  const body = Body.safeParse(raw);
  const { lat, lng, message } = body.success ? body.data : {};

  const { error } = await supabase.from("sos_events").insert({
    user_id:  user?.id ?? null,
    lat:      lat ?? null,
    lng:      lng ?? null,
    message:  message ?? null,
    status:   "open",
  });

  if (error) {
    console.error("[sos]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
