"use client";
import { useState } from "react";
import Link from "next/link";

interface Props {
  entityType: string;
  entityId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PriceSubmitModal({ entityType, entityId, onClose, onSuccess }: Props) {
  const [amount, setAmount]           = useState("");
  const [bargainPrice, setBargainPrice] = useState("");
  const [notes, setNotes]             = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");
  const [isNotVerified, setIsNotVerified] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setIsNotVerified(false);

    const payload: Record<string, unknown> = {
      entity_type: entityType,
      entity_id:   entityId,
      amount:      parseFloat(amount),
    };
    if (bargainPrice) payload.bargain_price = parseFloat(bargainPrice);
    if (notes.trim()) payload.notes = notes.trim();

    try {
      const r = await fetch("/api/prices/submit", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify(payload),
      });
      if (r.status === 403) {
        setIsNotVerified(true);
        setSubmitting(false);
        return;
      }
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Submission failed");
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--color-forest)" }}>
            📤 Submit Price Update
          </h2>
          <button
            onClick={onClose}
            className="text-sm opacity-50 hover:opacity-80 font-bold"
          >
            ✕
          </button>
        </div>

        {/* KYC gate */}
        {isNotVerified && (
          <div
            className="rounded-xl px-4 py-3 text-sm space-y-1"
            style={{ background: "var(--color-saffron-3)", border: "1px solid rgba(217,119,6,0.3)" }}
          >
            <p className="font-semibold" style={{ color: "#92400e" }}>
              Verified travellers only
            </p>
            <p className="opacity-80">
              Only verified travellers can submit prices.{" "}
              <Link href="/profile" className="underline font-semibold" style={{ color: "var(--color-forest)" }}>
                Complete document verification in your profile →
              </Link>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="form-label">
            Current price (₹) <span style={{ color: "var(--color-silk)" }}>*</span>
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <label className="form-label">
            Bargain price / what you actually paid (₹)
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 350 (optional)"
              value={bargainPrice}
              onChange={(e) => setBargainPrice(e.target.value)}
            />
          </label>

          <label className="form-label">
            Notes (optional)
            <textarea
              className="field"
              rows={3}
              maxLength={500}
              placeholder="Any context about this price…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error && (
            <p className="text-sm" style={{ color: "var(--color-silk)" }}>{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting || !amount}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "var(--color-forest)" }}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold opacity-60 hover:opacity-80"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
