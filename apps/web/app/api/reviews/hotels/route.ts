import { createClient } from "@/lib/supabase/server";
import { maskContacts } from "@/lib/mask";
import { NextResponse } from "next/server";
import { z } from "zod";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image
const MAX_IMAGES = 4;

const PostBody = z.object({
  entity_id:    z.string().min(1).max(100),
  rating:       z.number().int().min(1).max(5),
  title:        z.string().min(2).max(120),
  body:         z.string().max(2000).optional(),
  price_paid:   z.number().positive().optional(),
  bargain_price: z.number().positive().optional(),
});

export async function GET(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const place_id = searchParams.get("place_id");

  if (!place_id) {
    return NextResponse.json({ error: "place_id query param is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("hotel_reviews")
    .select(
      "id,user_id,entity_id,rating,title,body,price_paid,bargain_price,verified_traveller,helpful_count,created_at,image_urls"
    )
    .eq("entity_id", place_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[reviews/hotels GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch display names for reviewers — never expose email/phone
  const reviewerIds = [...new Set((data ?? []).map((r) => r.user_id))];
  let nameMap: Record<string, string> = {};
  if (reviewerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id,display_name")
      .in("user_id", reviewerIds);
    for (const p of profiles ?? []) {
      nameMap[p.user_id] = p.display_name;
    }
  }

  const reviews = (data ?? []).map((r) => ({
    ...r,
    body:         r.body != null ? maskContacts(r.body).text : r.body,
    display_name: nameMap[r.user_id] ?? "Traveller",
    user_id:      undefined, // do not expose user_id to clients
  }));

  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // KYC check
  const { data: kyc } = await supabase
    .from("kyc_verifications")
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "verified")
    .maybeSingle();

  if (!kyc) {
    return NextResponse.json(
      { error: "Only verified travellers can submit reviews. Complete document verification in your profile." },
      { status: 403 }
    );
  }

  // Parse multipart form (images optional) OR JSON (no images)
  const contentType = req.headers.get("content-type") ?? "";
  let fields: Record<string, string> = {};
  const imageUrls: string[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData().catch(() => null);
    if (!formData) return NextResponse.json({ error: "Bad request" }, { status: 400 });

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
      } else {
        // File upload
        const file = value as File;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) continue;
        if (file.size > MAX_IMAGE_BYTES) continue;
        if (imageUrls.length >= MAX_IMAGES) continue;

        const ext = file.type.split("/")[1];
        const path = `hotel-reviews/${user.id}/${Date.now()}-${imageUrls.length}.${ext}`;
        const bytes = await file.arrayBuffer();
        const { error: upErr } = await supabase.storage
          .from("review-images")
          .upload(path, bytes, { contentType: file.type, upsert: false });

        if (!upErr) {
          const { data: urlData } = supabase.storage.from("review-images").getPublicUrl(path);
          if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl);
        }
      }
    }
  } else {
    const raw = await req.json().catch(() => null);
    fields = raw ?? {};
  }

  const body = PostBody.safeParse({
    entity_id:    fields.entity_id,
    rating:       Number(fields.rating),
    title:        fields.title,
    body:         fields.body,
    price_paid:   fields.price_paid ? Number(fields.price_paid) : undefined,
    bargain_price: fields.bargain_price ? Number(fields.bargain_price) : undefined,
  });
  if (!body.success) {
    return NextResponse.json({ error: "Bad request", details: body.error.flatten() }, { status: 400 });
  }

  const { entity_id, rating, title, body: reviewBody, price_paid, bargain_price } = body.data;

  const { data, error } = await supabase
    .from("hotel_reviews")
    .insert({
      user_id:            user.id,
      entity_id,
      rating,
      title,
      body:               reviewBody ?? null,
      price_paid:         price_paid ?? null,
      bargain_price:      bargain_price ?? null,
      verified_traveller: true,
      image_urls:         imageUrls.length > 0 ? imageUrls : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[reviews/hotels POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
