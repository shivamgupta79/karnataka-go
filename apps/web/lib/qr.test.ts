import { describe, expect, it } from "vitest";
import { encodeQR, verifyQR, type QRPayload } from "./qr";

describe("QR token", () => {
  it("round-trips a trimmed {uid, ts} payload", async () => {
    const payload: QRPayload = { uid: "abc-123-xyz", ts: Date.now() };
    const token = await encodeQR(payload);
    expect(token.startsWith("KGOAPP:v1:")).toBe(true);
    const res = await verifyQR(token);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.payload.uid).toBe(payload.uid);
      expect(res.payload.ts).toBe(payload.ts);
    }
  });

  it("rejects a tampered signature", async () => {
    const payload: QRPayload = { uid: "abc", ts: Date.now() };
    const token = await encodeQR(payload);
    // Flip the last character of the hmac.
    const parts = token.split(":");
    const tampered = parts.slice(0, 3).join(":") + ":" + (parts[3] + "X");
    const res = await verifyQR(tampered);
    expect(res.ok).toBe(false);
  });

  it("rejects an expired token (>24h)", async () => {
    const payload: QRPayload = { uid: "abc", ts: Date.now() - 25 * 60 * 60 * 1000 };
    const token = await encodeQR(payload);
    const res = await verifyQR(token);
    expect(res.ok).toBe(false);
  });

  it("rejects a foreign QR string", async () => {
    const res = await verifyQR("https://example.com/something");
    expect(res.ok).toBe(false);
  });

  it("never embeds name/email/phone in the token", async () => {
    const payload: QRPayload = { uid: "uid-only", ts: 1700000000000 };
    const token = await encodeQR(payload);
    expect(token).not.toMatch(/@|email|phone|name/i);
  });
});
