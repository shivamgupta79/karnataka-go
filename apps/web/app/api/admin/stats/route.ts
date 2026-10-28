// GET /api/admin/stats — dashboard summary counts
// Requires ADMIN_SECRET header matching env var ADMIN_SECRET
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

function isAdmin(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get("x-admin-secret") === secret;
}

export async function GET(req: Request) {
  if (!isAdmin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sc = createServiceClient();
  if (!sc)
    return NextResponse.json({ error: "Service not configured" }, { status: 503 });

  const [users, trips, reviews, sosEvents, kycPending, reports, pendingReviews] = await Promise.all([
    sc.from("profiles").select("user_id", { count: "exact", head: true }),
    sc.from("trips").select("id", { count: "exact", head: true }),
    sc.from("hotel_reviews").select("id", { count: "exact", head: true }),
    sc.from("sos_events").select("id", { count: "exact", head: true }).eq("status", "open"),
    sc.from("kyc_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sc.from("message_reports").select("id", { count: "exact", head: true }).eq("auto_actioned", false),
    sc.from("hotel_reviews").select("id", { count: "exact", head: true }).eq("verified_traveller", false),
  ]);

  return NextResponse.json({
    users:          users.count          ?? 0,
    trips:          trips.count          ?? 0,
    reviews:        reviews.count        ?? 0,
    openSOS:        sosEvents.count      ?? 0,
    kycPending:     kycPending.count     ?? 0,
    openReports:    reports.count        ?? 0,
    pendingReviews: pendingReviews.count ?? 0,
  });
}
