import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const PatchBody = z.object({
  display_name: z.string().min(1).max(80).optional(),
  username: z
    .string()
    .regex(/^[a-z0-9_]{3,20}$/)
    .optional(),
  bio: z.string().max(300).optional(),
  locale: z.string().max(10).optional(),
  privacy_settings: z
    .object({
      shareEmail: z.boolean(),
      sharePhone: z.boolean(),
      showQR: z.boolean(),
    })
    .optional(),
});

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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: {
      ...profile,
      email: user.email ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      phone: user.phone ?? null,
      phone_confirmed_at: user.phone_confirmed_at ?? null,
    },
  });
}

export async function PATCH(req: Request) {
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

  const raw = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Check whether a profiles row already exists for this user.
  // If not, we must supply NOT NULL defaults (username, display_name) to avoid a
  // Postgres constraint violation on the INSERT path of upsert.
  const { data: existingRow } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let upsertPayload: Record<string, unknown> = { user_id: user.id, ...updates };
  if (!existingRow) {
    const emailPrefix = (user.email ?? "user")
      .split("@")[0]
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 20);
    const safeUsername =
      emailPrefix.length >= 3 ? emailPrefix : `user_${user.id.slice(0, 8)}`;
    upsertPayload = {
      display_name:
        user.user_metadata?.display_name ??
        user.user_metadata?.full_name ??
        emailPrefix,
      username: safeUsername,
      ...upsertPayload, // caller-supplied values win over defaults
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(upsertPayload, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
