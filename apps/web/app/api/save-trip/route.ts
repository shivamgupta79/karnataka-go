import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({ plan: z.any(), prefs: z.any(), title: z.string().max(120).optional() });

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const body = Body.safeParse(raw);
  if (!body.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Auth not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local." },
      { status: 503 }
    );
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const plan   = body.data.plan;
  const prefs  = body.data.prefs;
  const title  = body.data.title ?? `Karnataka ${plan.days?.length ?? "?"}-day trip`;

  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id:     user.id,
      preferences: { ...prefs, plan, title },
      budget:      prefs?.budget ?? 0,
      days:        plan?.days?.length ?? 0,
      status:      "draft",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[save-trip]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
