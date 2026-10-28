import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Plan } from "@/lib/types";
import { rateLimit } from "@/lib/rateLimit";

const Body = z.object({ plan: z.any(), language: z.string().max(30) });

const SYSTEM = `You are KarnatakaGo's travel narrator.
Use ONLY the structured plan JSON you are given. Never invent prices, timings, opening hours or safety claims;
if something is missing, say it is not available. Explain each day in a friendly way: short history (from "facts"),
food to try, photo tips, safety notes, and what changed to fit the budget. Mention that prices are estimates with
their source. Never reveal or ask for anyone's contact details. Reply in the requested language.`;

/**
 * Build an Anthropic client.
 * - If PORTKEY_API_KEY is set, proxy through Portkey AI gateway.
 *   Portkey expects the Anthropic API key forwarded via x-portkey-virtual-key
 *   or an x-portkey-provider header, NOT replacing the apiKey entirely.
 *   We keep apiKey as the Portkey key and tell Portkey to route to Anthropic.
 * - Otherwise fall back to direct Anthropic via ANTHROPIC_API_KEY.
 */
function buildClient(): Anthropic {
  const portkeyKey = process.env.PORTKEY_API_KEY;
  if (portkeyKey) {
    return new Anthropic({
      baseURL: "https://api.portkey.ai/v1",
      // Portkey accepts its own key as the Authorization bearer
      apiKey: portkeyKey,
      defaultHeaders: {
        "x-portkey-api-key": portkeyKey,
        "x-portkey-provider": "anthropic",
      },
    });
  }
  return new Anthropic(); // reads ANTHROPIC_API_KEY from env automatically
}

export async function POST(req: Request) {
  // ── 0. Rate limit — 10 narrate calls per minute per IP ───────────────────
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`narrate:${ip}`, { windowMs: 60_000, max: 10 });
  if (!rl.ok)
    return NextResponse.json({ error: rl.message }, { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });

  // ── 1. Parse & validate body ──────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = Body.safeParse(rawBody);
  if (!body.success) {
    return NextResponse.json({ error: "Bad request: " + JSON.stringify(body.error.flatten()) }, { status: 400 });
  }

  // ── 2. Guard: at least one AI key must be configured ─────────────────────
  if (!process.env.PORTKEY_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "No AI key configured. Set PORTKEY_API_KEY or ANTHROPIC_API_KEY in .env.local." },
      { status: 500 },
    );
  }

  // ── 3. Build slim plan summary to send to the model ──────────────────────
  const plan = body.data.plan as Plan;
  const byId = new Map(plan.places.map((p) => [p.id, p]));
  const slim = {
    variant: plan.variant,
    cost: plan.cost,
    withinBudget: plan.withinBudget,
    changes: plan.changes,
    warnings: plan.warnings,
    priceInfo: plan.priceInfo,
    days: plan.days.map((d) => ({
      day: d.day,
      date: d.date,
      badges: d.badges,
      warnings: d.warnings,
      timeline: d.items.map((i) => ({
        time: `${i.start}-${i.end}`,
        kind: i.kind,
        title: i.title,
        cost: i.cost,
      })),
      facts: d.placeIds.map((id) => ({
        name: byId.get(id)?.name,
        history: byId.get(id)?.history,
        photoTip: byId.get(id)?.photoTip,
        hours: byId.get(id)?.hours,
      })),
    })),
  };

  // ── 4. Call the AI model ──────────────────────────────────────────────────
  try {
    const client = buildClient();
    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1800,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Language: ${body.data.language}\n\nPlan JSON:\n${JSON.stringify(slim)}`,
        },
      ],
    });
    const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error("[narrate] AI call failed:", err);
    const message =
      err instanceof Error ? err.message : "AI service error. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
