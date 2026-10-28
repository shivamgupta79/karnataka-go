import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const EXT_MAP: Record<AllowedType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Checks magic bytes to verify the actual file format, guarding against a
 * client that sends a spoofed Content-Type header.
 * Returns the detected MIME type or null if unrecognised.
 */
function detectImageMime(buf: ArrayBuffer): AllowedType | null {
  const b = new Uint8Array(buf, 0, 12);
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) return "image/png";
  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'avatar' file field" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
    return NextResponse.json(
      { error: "File must be JPEG, PNG, or WebP" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be 2 MB or smaller" },
      { status: 400 }
    );
  }

  const ext = EXT_MAP[file.type as AllowedType];
  const storagePath = `${user.id}/${user.id}.${ext}`;

  const buffer = await file.arrayBuffer();

  // Magic-byte check: verify the actual file content matches the declared type.
  // file.type can be spoofed by a malicious client; this guards against that.
  const detectedMime = detectImageMime(buffer);
  if (!detectedMime) {
    return NextResponse.json(
      { error: "File content does not match an allowed image format (JPEG, PNG, WebP)" },
      { status: 400 }
    );
  }
  // Use the detected MIME (and its extension) rather than the client-declared one.
  const confirmedExt = EXT_MAP[detectedMime];
  const confirmedStoragePath = `${user.id}/${user.id}.${confirmedExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(confirmedStoragePath, buffer, { contentType: detectedMime, upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(confirmedStoragePath);

  // Seed display_name and username defaults so the upsert never fails with
  // a NOT NULL violation for brand-new users who haven't saved basic info yet.
  // These defaults are only written when no row exists (INSERT path); when a
  // profiles row already exists the upsert is an UPDATE and the ignoreDuplicates
  // flag ensures we only update avatar_url (we use a full upsert but only the
  // avatar_url column changes for existing rows via the ON CONFLICT DO UPDATE).
  // Simpler: fetch first and only update if row exists, otherwise upsert with defaults.
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let updateError;
  if (existingProfile) {
    // Row exists — update only avatar_url.
    const res = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);
    updateError = res.error;
  } else {
    // New user — insert with required NOT NULL defaults.
    const emailPrefix = (user.email ?? "user").split("@")[0].replace(/[^a-z0-9_]/g, "_").slice(0, 20);
    const safeUsername = emailPrefix.length >= 3 ? emailPrefix : `user_${user.id.slice(0, 8)}`;
    const res = await supabase.from("profiles").insert({
      user_id: user.id,
      avatar_url: publicUrl,
      display_name: user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? emailPrefix,
      username: safeUsername,
    });
    updateError = res.error;
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: publicUrl });
}
