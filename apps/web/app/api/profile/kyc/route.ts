import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_DOC_TYPES = ["aadhaar", "pan", "passport"] as const;
type DocType = (typeof VALID_DOC_TYPES)[number];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
// Explicit allowlist (SVG/GIF/etc. are rejected — SVG is an XSS vector if it is
// ever rendered back to an admin/reviewer). The client `accept` attribute
// narrows the picker, but it is bypassable, so the server enforces this too.
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/**
 * Checks magic bytes to detect the actual file format.
 * Returns the detected MIME type or null if unrecognised / not in the allowlist.
 * This guards against a client spoofing the Content-Type header.
 */
function detectKycMime(buf: ArrayBuffer): string | null {
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
  // PDF: %PDF (25 50 44 46)
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
}

export async function GET() {
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

  const { data, error } = await supabase
    .from("kyc_verifications")
    .select("id, doc_type, status, uploaded_at, reviewed_at")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ verifications: data ?? [] });
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

  const docType = formData.get("doc_type");
  const file = formData.get("document");

  if (typeof docType !== "string" || !VALID_DOC_TYPES.includes(docType as DocType)) {
    return NextResponse.json(
      { error: "doc_type must be aadhaar, pan, or passport" },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'document' file field" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be 5 MB or smaller" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File must be JPEG, PNG, WebP, or PDF" },
      { status: 400 }
    );
  }

  const storagePath = `${user.id}/${docType as DocType}`;
  const buffer = await file.arrayBuffer();

  // Guard: reject re-upload if the existing record is already 'verified'.
  // The UI also blocks this, but the server must enforce it independently to
  // prevent a direct API caller from silently downgrading a verified document.
  const { data: existingKyc } = await supabase
    .from("kyc_verifications")
    .select("status")
    .eq("user_id", user.id)
    .eq("doc_type", docType)
    .maybeSingle();

  if (existingKyc?.status === "verified") {
    return NextResponse.json(
      { error: "This document has already been verified and cannot be replaced" },
      { status: 409 }
    );
  }

  // Magic-byte check: verify actual file content matches an allowed format.
  const detectedMime = detectKycMime(buffer);
  if (!detectedMime || !ALLOWED_TYPES.has(detectedMime)) {
    return NextResponse.json(
      { error: "File content does not match an allowed format (JPEG, PNG, WebP, or PDF)" },
      { status: 400 }
    );
  }

  const { error: uploadError } = await supabase.storage
    .from("kyc-docs")
    .upload(storagePath, buffer, { contentType: detectedMime, upsert: true });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  const { data, error: upsertError } = await supabase
    .from("kyc_verifications")
    .upsert(
      {
        user_id: user.id,
        doc_type: docType,
        storage_path: storagePath,
        status: "pending",
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: "user_id,doc_type" }
    )
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "pending", record: data });
}
