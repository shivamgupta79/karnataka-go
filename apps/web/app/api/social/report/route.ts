import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { maskContacts } from "@/lib/mask";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  message_id: z.number().int().positive(),
  reason: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { message_id, reason } = parsed.data;

  // Fetch the message and verify caller is a conversation member
  const { data: message, error: msgErr } = await supabase
    .from("messages")
    .select("id, body, conversation_id")
    .eq("id", message_id)
    .single();

  if (msgErr || !message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Verify membership
  const { data: membership, error: memberErr } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", message.conversation_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberErr) {
    console.error("[report POST membership]", memberErr);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });
  }

  // Run maskContacts to check if message body contains contact info
  const { masked: wasAutoActioned } = maskContacts(message.body as string);

  // If contact info detected, update message body via service client (bypasses RLS)
  if (wasAutoActioned) {
    const serviceClient = createServiceClient();
    if (serviceClient) {
      const { error: updateErr } = await serviceClient
        .from("messages")
        .update({ body: "[removed by automated moderation]" })
        .eq("id", message_id);

      if (updateErr) {
        console.error("[report POST auto-moderate update]", updateErr);
        // Non-fatal — still record the report
      }
    }
  }

  // Insert the report
  const { error: insertErr } = await supabase.from("message_reports").insert({
    reporter_id: user.id,
    message_id,
    reason,
    auto_actioned: wasAutoActioned,
  });

  if (insertErr) {
    console.error("[report POST insert]", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, auto_actioned: wasAutoActioned });
}
