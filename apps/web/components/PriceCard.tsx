"use client";
import { useEffect, useState } from "react";
import { priceAge, formatLastUpdated } from "@/lib/prices";
import PriceSubmitModal from "./PriceSubmitModal";

export interface PriceRow {
  id: number;
  entity_type: string;
  entity_id: string;
  amount: number;
  bargain_price: number | null;
  currency: string;
  source: string;
  fetched_at: string;
  confidence: number;
  is_user_submitted: boolean;
}

interface Props {
  entityType: string;
  entityId: string;
  label?: string;
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const FRESHNESS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  fresh: { bg: "rgba(26,107,71,0.1)",  color: "var(--color-forest)",  label: "fresh"  },
  stale: { bg: "rgba(217,119,6,0.12)", color: "var(--color-saffron)", label: "stale"  },
  old:   { bg: "rgba(192,21,46,0.1)",  color: "var(--color-silk)",    label: "old"    },
};

export default function PriceCard({ entityType, entityId, label }: Props) {
  const [prices, setPrices]           = useState<PriceRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [prevAmount, setPrevAmount]   = useState<number | null>(null);

  function loadPrices() {
    fetch(`/api/prices?entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(entityId)}`)
      .then((r) => r.json())
      .then((j) => {
        const incoming: PriceRow[] = j.prices ?? [];
        setPrices((prev) => {
          if (prev.length > 0 && incoming.length > 0 && prev[0].amount !== incoming[0].amount) {
            setPrevAmount(prev[0].amount);
          }
          return incoming;
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    loadPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div className="card p-3 flex items-center gap-2 text-sm opacity-60">
        <span className="animate-spin">⏳</span> Loading price…
      </div>
    );
  }

  const latest = prices[0] ?? null;

  return (
    <>
      <div className="card p-3 space-y-2">
        {/* Header */}
        {label && (
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60">{label}</p>
        )}

        {/* Price changed banner */}
        {prevAmount !== null && latest && prevAmount !== latest.amount && (
          <div
            className="rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: "var(--color-saffron-3)", color: "#92400e", border: "1px solid rgba(217,119,6,0.3)" }}
          >
            ⚠ Price changed from {inr(prevAmount)} to {inr(latest.amount)}
          </div>
        )}

        {latest ? (
          <>
            {/* Main price row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-lg font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: "rgba(26,107,71,0.1)", color: "var(--color-forest)" }}
              >
                {inr(latest.amount)} <span className="text-xs font-normal opacity-70">{latest.currency}</span>
              </span>

              {/* Bargain price */}
              {latest.bargain_price !== null && (
                <span
                  className="text-sm font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(26,107,71,0.08)", color: "var(--color-forest-2)" }}
                >
                  💰 Bargain: {inr(latest.bargain_price)}
                </span>
              )}
            </div>

            {/* Freshness + last updated */}
            <div className="flex items-center gap-2 flex-wrap">
              {(() => {
                const tier = priceAge(latest.fetched_at);
                const style = FRESHNESS_STYLES[tier];
                return (
                  <span
                    className="text-xs font-semibold rounded-full px-2 py-0.5"
                    style={{ background: style.bg, color: style.color }}
                  >
                    ● {style.label}
                  </span>
                );
              })()}
              <span className="text-xs opacity-55">
                last updated {formatLastUpdated(latest.fetched_at)}
              </span>

              {/* Source pill */}
              <span
                className="text-xs rounded-full px-2 py-0.5"
                style={{ background: "rgba(0,0,0,0.05)", color: "inherit" }}
              >
                {latest.source}
              </span>

              {latest.is_user_submitted && (
                <span
                  className="text-xs rounded-full px-2 py-0.5 font-medium"
                  style={{ background: "rgba(217,119,6,0.12)", color: "#92400e" }}
                >
                  community
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm opacity-55">No price data yet — be the first to submit!</p>
        )}

        {/* Submit button */}
        <button
          onClick={() => setShowModal(true)}
          className="text-xs rounded-lg border px-3 py-1.5 font-semibold transition-colors hover:opacity-80"
          style={{ borderColor: "var(--color-temple-2)", color: "var(--color-forest)" }}
        >
          📤 Submit price update
        </button>
      </div>

      {showModal && (
        <PriceSubmitModal
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadPrices();
          }}
        />
      )}
    </>
  );
}
