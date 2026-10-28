// GET /api/admin/users?page=0&search=xxx — list users with block status
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

  const url = new URL(req.url);
  const page   = Math.max(0, Number(url.searchParams.get("page") ?? 0));
  const search = (url.searchParams.get("search") ?? "").trim();
  const limit  = 50;

  let q = sc
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, privacy_settings")
    .order("user_id")
    .range(page * limit, page * limit + limit - 1);

  if (search) q = q.ilike("display_name", `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch kyc status for each user
  const userIds = (data ?? []).map((u) => u.user_id);
  const { data: kyc } = await sc
    .from("kyc_verifications")
    .select("user_id, status")
    .in("user_id", userIds);

  const kycMap: Record<string, string> = {};
  for (const k of kyc ?? []) kycMap[k.user_id] = k.status;

  return NextResponse.json({
    users: (data ?? []).map((u) => ({
      ...u,
      kyc_status: kycMap[u.user_id] ?? "none",
    })),
  });
}
