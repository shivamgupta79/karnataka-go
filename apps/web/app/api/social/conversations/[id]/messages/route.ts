import { createClient } from "@/lib/supabase/server";
import { maskContacts } from "@/lib/mask";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  body: z.string().min(1).max(2000),
  message_type: z
    .enum(["text", "itinerary_share", "location", "help_request"])
    .optional()
    .default("text"),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Verify caller is a member of this conversation before reading messages
  const { data: membership, error: membershipErr } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipErr) {
    console.error("[messages GET membership check]", membershipErr);
    return NextResponse.json({ error: membershipErr.message }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, message_type")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[messages GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mask contact info in message bodies BEFORE returning to client
  const messages = (data ?? []).map((m) => ({
    ...m,
    body: maskContacts(m.body).text,
  }));

  return NextResponse.json({ messages });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Explicitly verify sender is a member of this conversation before inserting
  const { data: membership, error: membershipErr } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipErr) {
    console.error("[messages POST membership check]", membershipErr);
    return NextResponse.json({ error: membershipErr.message }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });
  }

  // Mask contact info BEFORE inserting into DB
  const { text: maskedBody } = maskContacts(parsed.data.body);

  const { error: insertErr } = await supabase.from("messages").insert({
    conversation_id: id,
    sender_id: user.id,
    body: maskedBody,
    message_type: parsed.data.message_type,
  });

  if (insertErr) {
    console.error("[messages POST insert]", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
