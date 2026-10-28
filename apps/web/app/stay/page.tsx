"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import ReviewCard, { type HotelReview } from "@/components/ReviewCard";
import ReviewSubmitModal from "@/components/ReviewSubmitModal";
import PriceCard from "@/components/PriceCard";
import stays from "@/data/stays.json";

type Stay = typeof stays[number];

const REGIONS = [...new Set(stays.map((s) => s.region))];

export default function StayPage() {
  const { user } = useAuth();
  const [region, setRegion] = useState<string>("All");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, HotelReview[]>>({});
  const [loadingReviews, setLoadingReviews] = useState<Record<string, boolean>>({});
  const [showReviewModal, setShowReviewModal] = useState<Stay | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const list = region === "All" ? stays : stays.filter((s) => s.region === region);

  // Load reviews when a stay is expanded
  async function loadReviews(stayId: string) {
    if (reviews[stayId] !== undefined) return;
    setLoadingReviews((p) => ({ ...p, [stayId]: true }));
    try {
      const r = await fetch(`/api/reviews/hotels?place_id=${encodeURIComponent(stayId)}`);
      const j = await r.json();
      setReviews((p) => ({ ...p, [stayId]: j.reviews ?? [] }));
    } catch {
      setReviews((p) => ({ ...p, [stayId]: [] }));
    }
    setLoadingReviews((p) => ({ ...p, [stayId]: false }));
  }

  function toggleExpand(id: string) {
    const next = expanded === id ? null : id;
    setExpanded(next);
    if (next) loadReviews(next);
  }

  function showToast(msg: string) {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  }

  return (
    <>
      {/* Toast */}
      {successToast && (
        <div
          className="fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: "var(--color-forest)" }}
        >
          ✓ {successToast}
        </div>
      )}

      <div className="max-w-3xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>
              🏨 Where to stay
            </h1>
            <p className="text-sm opacity-60 mt-1">
              Verified traveller reviews · live price data · bargain tips
            </p>
          </div>
          {user && (
            <p className="text-xs opacity-50 mt-1">
              ✓ Signed in — you can submit reviews after{" "}
              <Link href="/profile" className="underline" style={{ color: "var(--color-forest)" }}>
                KYC verification
              </Link>
            </p>
          )}
        </div>

        {/* Region filter */}
        <div className="flex flex-wrap gap-2 text-sm">
          {["All", ...REGIONS].map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className="rounded-full border px-3 py-1 text-sm font-medium transition-all"
              style={
                region === r
                  ? { background: "var(--color-forest)", color: "#fff", borderColor: "var(--color-forest)" }
                  : { borderColor: "var(--color-temple-2)", color: "inherit" }
              }
            >
              {r}
            </button>
          ))}
        </div>

        {/* Stay cards */}
        <div className="space-y-3">
          {list.map((s) => {
            const isOpen = expanded === s.id;
            const stayReviews = reviews[s.id] ?? [];
            const loadingThis = loadingReviews[s.id] ?? false;

            return (
              <div key={s.id} className="card overflow-hidden">
                {/* Stay header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold">{s.label}</h2>
                      <p className="text-sm opacity-60 mt-0.5 capitalize">
                        {s.region} · {s.type}
                        {s.familyFriendly && " · 👨‍👩‍👧 Family friendly"}
                        {s.vegFood && " · 🥗 Veg food"}
                        {s.parking && " · 🅿 Parking"}
                      </p>
                      {s.safetyFlags.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: "var(--color-forest)" }}>
                          🛡 {s.safetyFlags.join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold" style={{ color: "var(--color-forest)" }}>
                        ₹{s.pricePerNight.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs opacity-50">/ night (est.)</p>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => toggleExpand(s.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all"
                      style={{
                        borderColor: isOpen ? "var(--color-forest)" : "var(--color-temple-2)",
                        background: isOpen ? "var(--color-forest-3)" : undefined,
                        color: isOpen ? "var(--color-forest)" : "inherit",
                      }}
                    >
                      {isOpen ? "▲ Hide" : "▼ Reviews & prices"}
                      {stayReviews.length > 0 && ` (${stayReviews.length})`}
                    </button>

                    {user && (
                      <button
                        onClick={() => setShowReviewModal(s)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: "var(--color-saffron)" }}
                      >
                        ✍ Write review
                      </button>
                    )}

                    {!user && (
                      <Link
                        href="/auth"
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold border"
                        style={{ borderColor: "var(--color-temple-2)", color: "var(--color-forest)" }}
                      >
                        Sign in to review
                      </Link>
                    )}
                  </div>
                </div>

                {/* Expanded panel: prices + reviews */}
                {isOpen && (
                  <div
                    className="border-t px-4 pb-4 pt-3 space-y-4"
                    style={{ borderColor: "var(--color-temple-2)", background: "var(--color-forest-3)" }}
                  >
                    {/* Live price */}
                    <PriceCard
                      entityType="stay"
                      entityId={s.id}
                      label="Live price data"
                    />

                    {/* Reviews */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-2">
                        Traveller reviews
                      </p>

                      {loadingThis && (
                        <div className="flex items-center gap-2 text-sm opacity-50 py-2">
                          <span className="animate-spin">⏳</span> Loading reviews…
                        </div>
                      )}

                      {!loadingThis && stayReviews.length === 0 && (
                        <div className="text-sm opacity-55 py-2">
                          No verified reviews yet.{" "}
                          {user ? (
                            <button
                              onClick={() => setShowReviewModal(s)}
                              className="underline"
                              style={{ color: "var(--color-forest)" }}
                            >
                              Be the first →
                            </button>
                          ) : (
                            <Link href="/auth" className="underline" style={{ color: "var(--color-forest)" }}>
                              Sign in to review →
                            </Link>
                          )}
                        </div>
                      )}

                      <div className="space-y-3">
                        {stayReviews.map((rv) => (
                          <ReviewCard key={rv.id} review={rv} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs opacity-40 text-center">
          Reviews visible only from KYC-verified travellers. Prices are estimates — verify before booking.
        </p>
      </div>

      {/* Review submit modal */}
      {showReviewModal && (
        <ReviewSubmitModal
          type="hotel"
          entityId={showReviewModal.id}
          entityName={showReviewModal.label}
          onClose={() => setShowReviewModal(null)}
          onSuccess={() => {
            // Refresh reviews for this stay
            setReviews((p) => {
              const copy = { ...p };
              delete copy[showReviewModal.id];
              return copy;
            });
            loadReviews(showReviewModal.id);
            setShowReviewModal(null);
            showToast("Review submitted — pending verification before it appears publicly.");
          }}
        />
      )}
    </>
  );
}
