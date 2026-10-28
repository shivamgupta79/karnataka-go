// GET /api/admin/kyc — list all KYC submissions with signed storage URLs
// PATCH /api/admin/kyc — approve or reject a KYC document
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { z } from "zod";

function isAdmin(req: Request) {
  const s = process.env.ADMIN_SECRET;
  return s ? req.headers.get("x-admin-secret") === s : false;
}

const PatchBody = z.object({
  id:       z.number(),
  user_id:  z.string().uuid(),
  doc_type: z.enum(["aadhaar", "pan", "passport"]),
  status:   z.enum(["verified", "rejected"]),
});

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status") ?? "pending";

  const { data: kycs, error } = await sc
    .from("kyc_verifications")
    .select("id, user_id, doc_type, storage_path, status, uploaded_at, reviewed_at")
    .eq("status", statusFilter)
    .order("uploaded_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Resolve display names
  const uids = [...new Set((kycs ?? []).map((k) => k.user_id))];
  let nameMap: Record<string, string> = {};
  if (uids.length) {
    const { data: profiles } = await sc
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", uids);
    for (const p of profiles ?? [])
      nameMap[p.user_id] = p.display_name ?? p.username ?? "Unknown";
  }

  // Generate signed URLs for the documents (valid 10 minutes)
  const items = await Promise.all(
    (kycs ?? []).map(async (k) => {
      const { data: signed } = await sc.storage
        .from("kyc-docs")
        .createSignedUrl(k.storage_path, 600);
      return {
        ...k,
        display_name: nameMap[k.user_id] ?? "Unknown",
        signed_url: signed?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json({ kycs: items });
}

export async function PATCH(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const raw = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { id, status } = parsed.data;

  const { error } = await sc
    .from("kyc_verifications")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
