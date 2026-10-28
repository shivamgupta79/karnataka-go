import { NextResponse } from "next/server";
import { PrefsSchema } from "@/lib/schema";
import { buildPlans } from "@/lib/engine";
import { buildChecklist } from "@/lib/checklist";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  // Rate limit: 20 plan generations per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`plan:${ip}`, { windowMs: 60_000, max: 20 });
  if (!rl.ok)
    return NextResponse.json({ error: rl.message }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  const parsed = PrefsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const plans = await buildPlans(parsed.data);
  const balanced = plans.find((p) => p.variant === "balanced")!;
  return NextResponse.json({ plans, checklist: buildChecklist(parsed.data, balanced.places) });
}
