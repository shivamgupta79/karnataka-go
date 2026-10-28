import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  type: z.enum(["dm", "group", "trip"]),
  name: z.string().max(80).optional(),
  member_ids: z.array(z.string().uuid()).min(1).max(50),
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

  // Scope to conversations where the current user is a member
  const { data: memberRows, error: memberErr } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  if (memberErr) {
    console.error("[conversations GET members]", memberErr);
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  const conversationIds = (memberRows ?? []).map((r) => r.conversation_id);

  if (conversationIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("id, type, name, conversation_members(user_id)")
    .in("id", conversationIds)
    .order("id", { ascending: false });

  if (error) {
    console.error("[conversations GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [] });
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

  const { type, name, member_ids } = body.data;

  // Validate that all requested member_ids correspond to real registered users
  // by checking against the public profiles table. This prevents spam conversations
  // targeting arbitrary UUIDs and compensates for the open WITH CHECK (true) INSERT
  // RLS policy on conversations.
  const otherMemberIds = member_ids.filter((id) => id !== user.id);
  if (otherMemberIds.length > 0) {
    const { data: validProfiles, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id")
      .in("user_id", otherMemberIds);

    if (profileErr) {
      console.error("[conversations POST profile check]", profileErr);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    const validIds = new Set((validProfiles ?? []).map((p) => p.user_id));
    const invalidIds = otherMemberIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "One or more member_ids do not correspond to registered users" },
        { status: 400 }
      );
    }
  }

  // Insert conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({ type, name: name ?? null })
    .select("id")
    .single();

  if (convErr || !conv) {
    console.error("[conversations POST insert conv]", convErr);
    return NextResponse.json({ error: convErr?.message ?? "Failed to create conversation" }, { status: 500 });
  }

  // Deduplicate member_ids and always include current user
  const memberSet = new Set([user.id, ...member_ids]);
  const members = Array.from(memberSet).map((uid) => ({
    conversation_id: conv.id,
    user_id: uid,
  }));

  const { error: membersErr } = await supabase.from("conversation_members").insert(members);

  if (membersErr) {
    console.error("[conversations POST insert members]", membersErr);
    return NextResponse.json({ error: membersErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: conv.id }, { status: 201 });
}
