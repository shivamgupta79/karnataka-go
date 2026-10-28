import { describe, expect, it } from "vitest";
import { maskContacts } from "./mask";

describe("maskContacts", () => {
  it("hides phone numbers, emails and links", () => {
    const r = maskContacts("call 98765 43210 or mail a.b@x.com or see https://t.me/abc");
    expect(r.masked).toBe(true);
    expect(r.text).not.toMatch(/98765|@x\.com|t\.me/);
  });
  it("leaves normal text alone", () => {
    expect(maskContacts("Is Hampi road open today?")).toEqual({ text: "Is Hampi road open today?", masked: false });
  });
});
