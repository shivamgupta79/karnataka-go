"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import ReviewCard, { type FoodReview } from "@/components/ReviewCard";
import ReviewSubmitModal from "@/components/ReviewSubmitModal";
import dishes from "@/data/dishes.json";

// Each region acts as a "restaurant" entity for review purposes.
// entityId = slugified region name for the reviews API.
function toEntityId(region: string) {
  return region.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

type DishRegion = typeof dishes[number];

export default function FoodPage() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, FoodReview[]>>({});
  const [loadingReviews, setLoadingReviews] = useState<Record<string, boolean>>({});
  const [showReviewModal, setShowReviewModal] = useState<DishRegion | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  async function loadReviews(entityId: string) {
    if (reviews[entityId] !== undefined) return;
    setLoadingReviews((p) => ({ ...p, [entityId]: true }));
    try {
      const r = await fetch(`/api/reviews/food?restaurant_id=${encodeURIComponent(entityId)}`);
      const j = await r.json();
      setReviews((p) => ({ ...p, [entityId]: j.reviews ?? [] }));
    } catch {
      setReviews((p) => ({ ...p, [entityId]: [] }));
    }
    setLoadingReviews((p) => ({ ...p, [entityId]: false }));
  }

  function toggleExpand(entityId: string) {
    const next = expanded === entityId ? null : entityId;
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
              🍛 Regional food guide
            </h1>
            <p className="text-sm opacity-60 mt-1">
              Verified traveller food reviews · dish recommendations · price tips
            </p>
          </div>
          {user && (
            <p className="text-xs opacity-50 mt-1">
              ✓ Signed in — submit reviews after{" "}
              <Link href="/profile" className="underline" style={{ color: "var(--color-forest)" }}>
                KYC verification
              </Link>
            </p>
          )}
        </div>

        {/* Region cards */}
        <div className="space-y-3">
          {dishes.map((region) => {
            const entityId = toEntityId(region.region);
            const isOpen = expanded === entityId;
            const regionReviews = reviews[entityId] ?? [];
            const loadingThis = loadingReviews[entityId] ?? false;

            return (
              <div key={region.region} className="card overflow-hidden">
                {/* Region header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1">
                      <h2 className="font-bold text-lg">{region.region}</h2>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {region.dishes.map((dish) => (
                          <span
                            key={dish}
                            className="text-xs rounded-full px-2.5 py-1 font-medium"
                            style={{ background: "rgba(217,119,6,0.1)", color: "#92400e" }}
                          >
                            {dish}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => toggleExpand(entityId)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all"
                      style={{
                        borderColor: isOpen ? "var(--color-forest)" : "var(--color-temple-2)",
                        background: isOpen ? "var(--color-forest-3)" : undefined,
                        color: isOpen ? "var(--color-forest)" : "inherit",
                      }}
                    >
                      {isOpen ? "▲ Hide" : "▼ Reviews & tips"}
                      {regionReviews.length > 0 && ` (${regionReviews.length})`}
                    </button>

                    {user ? (
                      <button
                        onClick={() => setShowReviewModal(region)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: "var(--color-saffron)" }}
                      >
                        ✍ Write food review
                      </button>
                    ) : (
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

                {/* Expanded panel: reviews */}
                {isOpen && (
                  <div
                    className="border-t px-4 pb-4 pt-3 space-y-3"
                    style={{ borderColor: "var(--color-temple-2)", background: "var(--color-forest-3)" }}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest opacity-50">
                      Traveller food reviews
                    </p>

                    {loadingThis && (
                      <div className="flex items-center gap-2 text-sm opacity-50 py-2">
                        <span className="animate-spin">⏳</span> Loading reviews…
                      </div>
                    )}

                    {!loadingThis && regionReviews.length === 0 && (
                      <div className="text-sm opacity-55 py-2">
                        No verified food reviews yet.{" "}
                        {user ? (
                          <button
                            onClick={() => setShowReviewModal(region)}
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
                      {regionReviews.map((rv) => (
                        <ReviewCard key={rv.id} review={rv} />
                      ))}
                    </div>

                    {/* Price tips summary */}
                    {regionReviews.some((rv) => rv.price_paid != null || rv.bargain_price != null) && (
                      <div
                        className="rounded-xl p-3 text-xs space-y-1"
                        style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.2)" }}
                      >
                        <p className="font-semibold" style={{ color: "#92400e" }}>
                          💡 Price tips from travellers
                        </p>
                        {regionReviews
                          .filter((rv) => rv.bargain_price != null)
                          .slice(0, 3)
                          .map((rv) => (
                            <p key={rv.id} className="opacity-75">
                              {rv.display_name}: paid ₹{rv.price_paid?.toLocaleString("en-IN")}
                              {rv.bargain_price != null &&
                                ` · negotiated to ₹${rv.bargain_price.toLocaleString("en-IN")}`}
                              {rv.dish_name && ` (${rv.dish_name})`}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-xs opacity-40 text-center">
          Reviews visible only from KYC-verified travellers. Dish availability varies by season and restaurant.
        </p>
      </div>

      {/* Food review modal */}
      {showReviewModal && (
        <ReviewSubmitModal
          type="food"
          entityId={toEntityId(showReviewModal.region)}
          entityName={`${showReviewModal.region} cuisine`}
          onClose={() => setShowReviewModal(null)}
          onSuccess={() => {
            const eid = toEntityId(showReviewModal.region);
            setReviews((p) => {
              const copy = { ...p };
              delete copy[eid];
              return copy;
            });
            loadReviews(eid);
            setShowReviewModal(null);
            showToast("Food review submitted — pending verification before it appears publicly.");
          }}
        />
      )}
    </>
  );
}
