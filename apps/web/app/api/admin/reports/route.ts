// GET /api/admin/reports — list open message reports
// PATCH /api/admin/reports — mark a report reviewed/actioned
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
    .from("message_reports")
    .select("id, reporter_id, message_id, reason, auto_actioned, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

export async function PATCH(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const { id, auto_actioned } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await sc.from("message_reports").update({ auto_actioned: !!auto_actioned }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
