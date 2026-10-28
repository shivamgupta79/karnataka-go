// QR token format: KGOAPP:v1:<base64url(JSON)>:<hmac>
//
// The payload carries ONLY the user id and a timestamp — no name, email, or
// phone. Email/phone are resolved server-side from the target user's privacy
// settings (see /api/profile/lookup/[uid]), so nothing the user did not opt to
// share is ever embedded in the QR image or token.
//
// HMAC key: first 32 chars of NEXT_PUBLIC_SUPABASE_URL (or a local fallback).
// The signature is an integrity guard (it stops a user pasting a tampered
// string); it is NOT a security boundary. The real gate on the lookup route is
// that the caller must be signed in, plus the target's privacy flags.

export interface QRPayload {
  uid: string;
  ts: number; // Unix ms timestamp
}

const PREFIX = "KGOAPP:v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours (enforced client-side)

function getHmacKeyMaterial(): string {
  const raw =
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : undefined) ?? "karnataka-go-local";
  return raw.slice(0, 32).padEnd(32, "0");
}

async function importKey(material: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(material),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function encodeQR(payload: QRPayload): Promise<string> {
  const json = JSON.stringify(payload);
  const b64 = toBase64Url(new TextEncoder().encode(json));
  const key = await importKey(getHmacKeyMaterial());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(b64));
  const hmac = toBase64Url(sig);
  return `${PREFIX}:${b64}:${hmac}`;
}

export type VerifyResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; error: string };

export async function verifyQR(raw: string): Promise<VerifyResult> {
  const parts = raw.split(":");
  // Format: KGOAPP : v1 : <b64> : <hmac>  — at least 4 parts
  if (parts.length < 4 || parts[0] !== "KGOAPP" || parts[1] !== "v1") {
    return { ok: false, error: "Not a KarnatakaGo QR code" };
  }
  const b64 = parts[2];
  const hmac = parts.slice(3).join(":");

  const key = await importKey(getHmacKeyMaterial());
  let sigBytes: Uint8Array;
  try {
    sigBytes = fromBase64Url(hmac);
  } catch {
    return { ok: false, error: "Invalid QR signature" };
  }
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes.buffer as ArrayBuffer,
    new TextEncoder().encode(b64)
  );
  if (!valid) return { ok: false, error: "Invalid QR signature" };

  let payload: QRPayload;
  try {
    const jsonBytes = fromBase64Url(b64);
    payload = JSON.parse(new TextDecoder().decode(jsonBytes)) as QRPayload;
  } catch {
    return { ok: false, error: "Malformed QR payload" };
  }

  if (Date.now() - payload.ts > MAX_AGE_MS) {
    return { ok: false, error: "QR code has expired (>24h)" };
  }

  return { ok: true, payload };
}
