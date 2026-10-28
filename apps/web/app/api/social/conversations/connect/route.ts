// POST /api/social/conversations/connect
// Scans a verified QR payload and starts (or finds) a DM conversation with
// the target user. Returns { conversationId } ready to navigate to.
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({ target_uid: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { target_uid } = parsed.data;

  if (target_uid === user.id)
    return NextResponse.json({ error: "Cannot start a chat with yourself" }, { status: 400 });

  // Verify target exists in profiles
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("user_id, username, display_name")
    .eq("user_id", target_uid)
    .maybeSingle();

  if (!targetProfile)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Look for an existing DM between these two users to avoid duplicates
  const { data: myConvs } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (myConvs && myConvs.length > 0) {
    const myConvIds = myConvs.map((r) => r.conversation_id);
    const { data: sharedConvs } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", target_uid)
      .in("conversation_id", myConvIds);

    if (sharedConvs && sharedConvs.length > 0) {
      // Return the first shared DM conversation
      const sharedId = sharedConvs[0].conversation_id;
      const { data: convRow } = await supabase
        .from("conversations")
        .select("id, type")
        .eq("id", sharedId)
        .eq("type", "dm")
        .maybeSingle();

      if (convRow) {
        return NextResponse.json({ conversationId: convRow.id, existing: true });
      }
    }
  }

  // Create new DM conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({ type: "dm", name: null })
    .select("id")
    .single();

  if (convErr || !conv)
    return NextResponse.json({ error: convErr?.message ?? "Failed to create conversation" }, { status: 500 });

  const { error: membersErr } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: target_uid },
    ]);

  if (membersErr)
    return NextResponse.json({ error: membersErr.message }, { status: 500 });

  return NextResponse.json({
    conversationId: conv.id,
    existing: false,
    targetName: targetProfile.display_name ?? targetProfile.username ?? "Traveller",
  }, { status: 201 });
}
