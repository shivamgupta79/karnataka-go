// GET /api/banners — public endpoint, returns active banners for the site
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ banners: [] });

  const now = new Date().toISOString();
  const { data } = await supabase
    .from("banners")
    .select("id,title,subtitle,cta_label,url,image_url,bg_color,text_color,type,position,priority")
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("priority", { ascending: false })
    .limit(10);

  return NextResponse.json({ banners: data ?? [] });
}
