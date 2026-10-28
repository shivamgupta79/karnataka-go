import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
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

  const communityId = Number(id);
  if (isNaN(communityId)) {
    return NextResponse.json({ error: "Invalid community id" }, { status: 400 });
  }

  const { error } = await supabase.from("community_members").insert({
    community_id: communityId,
    user_id: user.id,
    role: "member",
  });

  if (error) {
    // Unique constraint violation — already a member — treat as success
    if (error.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    console.error("[community join POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
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

  const communityId = Number(id);
  if (isNaN(communityId)) {
    return NextResponse.json({ error: "Invalid community id" }, { status: 400 });
  }

  // Check role before allowing leave — owners cannot leave
  const { data: membership, error: roleErr } = await supabase
    .from("community_members")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .single();

  if (roleErr || !membership) {
    return NextResponse.json({ error: "Not a member of this community" }, { status: 404 });
  }

  if (membership.role === "owner") {
    return NextResponse.json({ error: "Owners cannot leave their community" }, { status: 403 });
  }

  const { error: deleteErr } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", user.id);

  if (deleteErr) {
    console.error("[community leave DELETE]", deleteErr);
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
