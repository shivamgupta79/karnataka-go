import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkOtpLimit } from "@/lib/rateLimit";

export async function POST() {
  const supabase = await createClient();
  if (!supabase)
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!user.email)
    return NextResponse.json({ error: "No email on account" }, { status: 400 });

  // OTP rate limit shared across email sends for this user
  const limit = checkOtpLimit(`email:${user.id}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.message, blockedUntil: limit.blockedUntil ?? null },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(((limit.blockedUntil ?? Date.now() + 60000) - Date.now()) / 1000)) },
      }
    );
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
    },
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
