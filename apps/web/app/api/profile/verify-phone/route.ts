import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkOtpLimit } from "@/lib/rateLimit";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
    phone: z.string().regex(/^\+91[6-9]\d{9}$/),
  }),
  z.object({
    action: z.literal("verify"),
    phone: z.string().regex(/^\+91[6-9]\d{9}$/),
    token: z.string().min(4).max(8),
  }),
]);

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
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });

  // OTP rate limit — only on "send" action
  if (parsed.data.action === "send") {
    const limit = checkOtpLimit(`phone:${user.id}`);
    if (!limit.ok) {
      return NextResponse.json(
        { error: limit.message, blockedUntil: limit.blockedUntil ?? null },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(((limit.blockedUntil ?? Date.now() + 60000) - Date.now()) / 1000)) },
        }
      );
    }

    const { error } = await supabase.auth.updateUser({ phone: parsed.data.phone });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  // action === "verify"
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: "phone_change",
  });
  if (error)
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
