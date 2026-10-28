// PATCH /api/admin/banners/[id] — update a banner
// DELETE /api/admin/banners/[id] — delete a banner
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { z } from "zod";

function isAdmin(req: Request) {
  const s = process.env.ADMIN_SECRET;
  return s ? req.headers.get("x-admin-secret") === s : false;
}

const PatchBody = z.object({
  title:      z.string().min(1).max(120).optional(),
  subtitle:   z.string().max(200).optional(),
  cta_label:  z.string().max(40).optional(),
  url:        z.string().optional(),
  image_url:  z.string().optional(),
  bg_color:   z.string().optional(),
  text_color: z.string().optional(),
  type:       z.enum(["banner", "ad", "announcement"]).optional(),
  position:   z.enum(["top", "bottom", "inline"]).optional(),
  active:     z.boolean().optional(),
  priority:   z.number().int().optional(),
  starts_at:  z.string().optional().nullable(),
  ends_at:    z.string().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const raw = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { data, error } = await sc
    .from("banners")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banner: data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const { error } = await sc.from("banners").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
