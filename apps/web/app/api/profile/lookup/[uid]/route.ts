import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

interface ProfileRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  privacy_settings: {
    shareEmail: boolean;
    sharePhone: boolean;
    showQR: boolean;
  } | null;
}

// This route resolves a scanned user's profile. The caller MUST be signed in
// (the scanner is only reachable from the auth-gated profile page). The QR
// signature is treated as an integrity-only guard verified client-side; the
// real trust boundary here is authentication plus the target user's privacy
// flags, which are read from the database — never from the QR payload.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params;

  // 1. Require a signed-in caller (like every other route in this module).
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // 2. Read the target profile with the service client (the profiles table is
  //    publicly readable, but auth.users email/phone require the admin API).
  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return NextResponse.json({ error: "Service not configured" }, { status: 503 });
  }

  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, privacy_settings")
    .eq("user_id", uid)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const row = profile as ProfileRow;
  const privacy = row.privacy_settings ?? {
    shareEmail: false,
    sharePhone: false,
    showQR: true,
  };

  if (!privacy.showQR) {
    return NextResponse.json(
      { error: "This user's QR code is private" },
      { status: 403 }
    );
  }

  let email: string | null = null;
  let phone: string | null = null;
  if (privacy.shareEmail || privacy.sharePhone) {
    const { data: authUser } = await serviceClient.auth.admin.getUserById(uid);
    if (authUser?.user) {
      if (privacy.shareEmail) email = authUser.user.email ?? null;
      if (privacy.sharePhone) phone = authUser.user.phone ?? null;
    }
  }

  return NextResponse.json({
    uid: row.user_id,
    name: row.display_name ?? row.username ?? "KarnatakaGo traveller",
    username: row.username,
    avatar_url: row.avatar_url,
    email,
    phone,
  });
}
