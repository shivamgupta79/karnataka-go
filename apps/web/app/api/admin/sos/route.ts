// GET /api/admin/sos — list open SOS events
// PATCH /api/admin/sos/[id] — resolve an SOS event
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

function isAdmin(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  return secret ? req.headers.get("x-admin-secret") === secret : false;
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const { data, error } = await sc
    .from("sos_events")
    .select("id, user_id, lat, lng, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve display names
  const uids = [...new Set((data ?? []).filter((e) => e.user_id).map((e) => e.user_id as string))];
  let nameMap: Record<string, string> = {};
  if (uids.length) {
    const { data: profiles } = await sc.from("profiles").select("user_id, display_name").in("user_id", uids);
    for (const p of profiles ?? []) nameMap[p.user_id] = p.display_name;
  }

  return NextResponse.json({
    events: (data ?? []).map((e) => ({
      ...e,
      display_name: e.user_id ? (nameMap[e.user_id] ?? "Unknown user") : "Anonymous",
    })),
  });
}

export async function PATCH(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !["resolved", "open"].includes(status))
    return NextResponse.json({ error: "id and status required" }, { status: 400 });

  const { error } = await sc.from("sos_events").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
