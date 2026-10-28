import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const entity_type = searchParams.get("entity_type");
  const entity_id   = searchParams.get("entity_id");

  if (!entity_type || !entity_id) {
    return NextResponse.json(
      { error: "entity_type and entity_id query params are required" },
      { status: 400 }
    );
  }

  // Prices are public data — no auth required. user_id is omitted to avoid exposing submitter identity.
  const { data, error } = await supabase
    .from("prices")
    .select(
      "id,entity_type,entity_id,amount,bargain_price,currency,source,fetched_at,confidence,is_user_submitted"
    )
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)
    .order("fetched_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[prices GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // User submissions — only if authenticated
  let submissions: unknown[] = [];
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: subData, error: subError } = await supabase
      .from("price_submissions")
      .select("id,amount,bargain_price,currency,notes,created_at,status")
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!subError) {
      submissions = subData ?? [];
    }
  }

  return NextResponse.json({
    prices:          data ?? [],
    userSubmissions: submissions,
    lastUpdated:     data?.[0]?.fetched_at ?? null,
  });
}
