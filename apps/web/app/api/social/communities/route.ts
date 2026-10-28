import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  type: z.enum(["public", "private"]).default("public"),
});

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
    .from("communities")
    .select("id, name, description, type, owner_id, community_members(count)")
    .eq("type", "public")
    .order("id", { ascending: false });

  if (error) {
    console.error("[communities GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ communities: data ?? [] });
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const body = Body.safeParse(raw);
  if (!body.success) {
    return NextResponse.json({ error: "Bad request", details: body.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { name, description, type } = body.data;

  const { data: community, error: communityErr } = await supabase
    .from("communities")
    .insert({ name, description: description ?? null, type, owner_id: user.id })
    .select("id")
    .single();

  if (communityErr || !community) {
    console.error("[communities POST insert]", communityErr);
    return NextResponse.json({ error: communityErr?.message ?? "Failed to create community" }, { status: 500 });
  }

  const { error: memberErr } = await supabase.from("community_members").insert({
    community_id: community.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberErr) {
    console.error("[communities POST insert member]", memberErr);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: community.id }, { status: 201 });
}
