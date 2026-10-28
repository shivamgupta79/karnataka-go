// GET  /api/admin/reviews?type=hotel|food&status=pending|approved|rejected
// PATCH /api/admin/reviews — approve or reject a review
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { z } from "zod";

function isAdmin(req: Request) {
  const s = process.env.ADMIN_SECRET;
  return s ? req.headers.get("x-admin-secret") === s : false;
}

const PatchBody = z.object({
  id:       z.number(),
  type:     z.enum(["hotel", "food"]),
  approved: z.boolean(),
});

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const url  = new URL(req.url);
  const type = url.searchParams.get("type") ?? "hotel";     // hotel | food
  // verified_traveller=false means pending review; true means approved
  const pendingOnly = url.searchParams.get("status") !== "approved";

  const table = type === "food" ? "food_reviews" : "hotel_reviews";

  const { data, error } = await sc
    .from(table)
    .select("id, user_id, rating, title, body, price_paid, bargain_price, image_urls, verified_traveller, created_at"
      + (type === "food" ? ", restaurant_id, dish_name" : ", entity_id"))
    .eq("verified_traveller", !pendingOnly)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve display names
  const rows = (data as unknown as Array<Record<string, unknown>>) ?? [];
  const uids = [...new Set(rows.map((r) => r.user_id as string))];
  let nameMap: Record<string, string> = {};
  if (uids.length) {
    const { data: profiles } = await sc
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", uids);
    for (const p of profiles ?? []) nameMap[p.user_id] = p.display_name ?? "Unknown";
  }

  return NextResponse.json({
    reviews: rows.map((r) => ({ ...r, display_name: nameMap[r.user_id as string] ?? "Unknown" })),
  });
}

export async function PATCH(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const raw = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { id, type, approved } = parsed.data;
  const table = type === "food" ? "food_reviews" : "hotel_reviews";

  if (approved) {
    // Approve: set verified_traveller = true so review becomes public
    const { error } = await sc.from(table).update({ verified_traveller: true }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Reject: delete the review
    const { error } = await sc.from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, approved });
}
