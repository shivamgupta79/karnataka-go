// PATCH /api/admin/users/[uid] — ban/unban, approve/reject KYC
// DELETE /api/admin/users/[uid] — delete user (irreversible)
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { unblockOtp } from "@/lib/rateLimit";

function isAdmin(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  return secret ? req.headers.get("x-admin-secret") === secret : false;
}

const PatchBody = z.object({
  action: z.enum(["ban", "unban", "approve_kyc", "reject_kyc", "unblock_otp"]),
  doc_type: z.enum(["aadhaar", "pan", "passport"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { uid } = await params;

  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const raw = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { action, doc_type } = parsed.data;

  if (action === "ban") {
    const { error } = await sc.auth.admin.updateUserById(uid, { ban_duration: "876600h" }); // ~100 years
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "banned" });
  }

  if (action === "unban") {
    const { error } = await sc.auth.admin.updateUserById(uid, { ban_duration: "none" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action: "unbanned" });
  }

  if (action === "unblock_otp") {
    unblockOtp(`phone:${uid}`);
    unblockOtp(`email:${uid}`);
    return NextResponse.json({ ok: true, action: "otp_unblocked" });
  }

  if ((action === "approve_kyc" || action === "reject_kyc") && doc_type) {
    const { error } = await sc
      .from("kyc_verifications")
      .update({ status: action === "approve_kyc" ? "verified" : "rejected", reviewed_at: new Date().toISOString() })
      .eq("user_id", uid)
      .eq("doc_type", doc_type);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, action });
  }

  return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
}
