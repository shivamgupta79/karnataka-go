import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  entity_type:   z.string().min(1).max(50),
  entity_id:     z.string().min(1).max(100),
  amount:        z.number().positive(),
  bargain_price: z.number().positive().optional(),
  currency:      z.string().default("INR"),
  notes:         z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // KYC check — only verified travellers may submit prices
  const { data: kyc } = await supabase
    .from("kyc_verifications")
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "verified")
    .maybeSingle();

  if (!kyc) {
    return NextResponse.json(
      { error: "Only verified travellers can submit prices. Complete document verification in your profile." },
      { status: 403 }
    );
  }

  const raw = await req.json().catch(() => null);
  const body = Body.safeParse(raw);
  if (!body.success) {
    return NextResponse.json({ error: "Bad request", details: body.error.flatten() }, { status: 400 });
  }

  const { entity_type, entity_id, amount, bargain_price, currency, notes } = body.data;

  const { error } = await supabase.from("price_submissions").insert({
    user_id:      user.id,
    entity_type,
    entity_id,
    amount,
    bargain_price: bargain_price ?? null,
    currency,
    notes:        notes ?? null,
  });

  if (error) {
    console.error("[prices/submit POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
