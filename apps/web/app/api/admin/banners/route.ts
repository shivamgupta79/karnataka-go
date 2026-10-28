// GET  /api/admin/banners — list all banners (admin)
// POST /api/admin/banners — create a banner
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { z } from "zod";

function isAdmin(req: Request) {
  const s = process.env.ADMIN_SECRET;
  return s ? req.headers.get("x-admin-secret") === s : false;
}

const Body = z.object({
  title:      z.string().min(1).max(120),
  subtitle:   z.string().max(200).optional(),
  cta_label:  z.string().max(40).optional(),
  url:        z.string().url().optional().or(z.literal("")),
  image_url:  z.string().url().optional().or(z.literal("")),
  bg_color:   z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  text_color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  type:       z.enum(["banner", "ad", "announcement"]).optional(),
  position:   z.enum(["top", "bottom", "inline"]).optional(),
  active:     z.boolean().optional(),
  priority:   z.number().int().optional(),
  starts_at:  z.string().optional(),
  ends_at:    z.string().optional(),
});

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const { data, error } = await sc
    .from("banners")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banners: data ?? [] });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sc = createServiceClient();
  if (!sc) return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const raw = await req.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "Bad request", details: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await sc.from("banners").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ banner: data }, { status: 201 });
}
