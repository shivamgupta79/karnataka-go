import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Membership check
  const { data: membership } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership)
    return NextResponse.json({ error: "Not a member" }, { status: 403 });

  // Get all member user_ids
  const { data: members, error } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (members ?? []).map((m) => m.user_id);

  // Resolve display names and usernames from profiles (public data only)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, display_name")
    .in("user_id", userIds);

  const result = (profiles ?? []).map((p) => ({
    user_id:      p.user_id,
    username:     p.username ?? "traveller",
    display_name: p.display_name ?? p.username ?? "Traveller",
  }));

  return NextResponse.json({ members: result });
}
