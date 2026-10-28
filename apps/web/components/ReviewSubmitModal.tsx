"use client";
import { useRef, useState } from "react";
import Link from "next/link";

interface Props {
  type: "hotel" | "food";
  entityId: string;
  entityName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_IMAGES = 4;
const MAX_BYTES  = 5 * 1024 * 1024; // 5 MB

export default function ReviewSubmitModal({ type, entityId, entityName, onClose, onSuccess }: Props) {
  const [rating, setRating]               = useState(0);
  const [hoverRating, setHoverRating]     = useState(0);
  const [title, setTitle]                 = useState("");
  const [body, setBody]                   = useState("");
  const [pricePaid, setPricePaid]         = useState("");
  const [bargainPrice, setBargainPrice]   = useState("");
  const [dishName, setDishName]           = useState("");
  const [images, setImages]               = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");
  const [isNotVerified, setIsNotVerified] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const endpoint = type === "hotel" ? "/api/reviews/hotels" : "/api/reviews/food";

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter(
      (f) => f.size <= MAX_BYTES && ["image/jpeg","image/png","image/webp"].includes(f.type)
    );
    const remaining = MAX_IMAGES - images.length;
    const toAdd = valid.slice(0, remaining);
    setImages((p) => [...p, ...toAdd]);
    const previews = toAdd.map((f) => URL.createObjectURL(f));
    setImagePreviews((p) => [...p, ...previews]);
    // reset input so same file can be re-picked after removal
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(idx: number) {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImages((p) => p.filter((_, i) => i !== idx));
    setImagePreviews((p) => p.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    setSubmitting(true);
    setError("");
    setIsNotVerified(false);

    const fd = new FormData();
    fd.append("rating", String(rating));
    fd.append("title", title.trim());
    if (body.trim()) fd.append("body", body.trim());
    if (pricePaid)   fd.append("price_paid", pricePaid);
    if (bargainPrice) fd.append("bargain_price", bargainPrice);

    if (type === "hotel") {
      fd.append("entity_id", entityId);
    } else {
      fd.append("restaurant_id", entityId);
      if (dishName.trim()) fd.append("dish_name", dishName.trim());
    }

    images.forEach((img) => fd.append("images", img));

    try {
      const r = await fetch(endpoint, { method: "POST", body: fd });
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
      // clean up object URLs
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  }

  const displayRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-md p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: "var(--color-forest)" }}>
            {type === "hotel" ? "🏨 Write a Review" : "🍽 Write a Food Review"}
          </h2>
          <button onClick={onClose} className="text-sm opacity-50 hover:opacity-80 font-bold">✕</button>
        </div>

        {entityName && <p className="text-sm opacity-60">{entityName}</p>}

        {/* KYC gate */}
        {isNotVerified && (
          <div
            className="rounded-xl px-4 py-3 text-sm space-y-1"
            style={{ background: "var(--color-saffron-3)", border: "1px solid rgba(217,119,6,0.3)" }}
          >
            <p className="font-semibold" style={{ color: "#92400e" }}>Verified travellers only</p>
            <p className="opacity-80">
              Only verified travellers can submit reviews.{" "}
              <Link href="/profile" className="underline font-semibold" style={{ color: "var(--color-forest)" }}>
                Complete document verification in your profile →
              </Link>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Star selector */}
          <div>
            <p className="form-label mb-1">Rating <span style={{ color: "var(--color-silk)" }}>*</span></p>
            <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                  aria-checked={rating === star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="text-2xl transition-transform hover:scale-110"
                  style={{ color: star <= displayRating ? "#d97706" : "#d1d5db" }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Dish name (food only) */}
          {type === "food" && (
            <label className="form-label">
              Dish name (optional)
              <input
                className="field"
                type="text"
                maxLength={80}
                placeholder="e.g. Bisi Bele Bath"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
              />
            </label>
          )}

          <label className="form-label">
            Title <span style={{ color: "var(--color-silk)" }}>*</span>
            <input
              className="field"
              type="text"
              required
              minLength={2}
              maxLength={120}
              placeholder="Short summary of your experience"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="form-label">
            Review (optional)
            <textarea
              className="field"
              rows={4}
              maxLength={2000}
              placeholder="Tell other travellers what you experienced…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          {/* Photo upload */}
          <div>
            <p className="form-label mb-1">Photos (optional, up to {MAX_IMAGES})</p>
            <p className="text-xs opacity-50 mb-2">JPG / PNG / WebP · max 5 MB each</p>

            {/* Preview grid */}
            {imagePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border"
                    style={{ borderColor: "var(--color-temple-2)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full text-white text-xs flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length < MAX_IMAGES && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImagePick}
                  id="review-image-input"
                />
                <label
                  htmlFor="review-image-input"
                  className="inline-flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--color-forest)", color: "var(--color-forest)" }}
                >
                  📷 Add photo{images.length > 0 ? "s" : ""}
                  {images.length > 0 && ` (${images.length}/${MAX_IMAGES})`}
                </label>
              </>
            )}
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <label className="form-label">
              Price paid (₹)
              <input
                className="field"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 1200"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
              />
            </label>
            <label className="form-label">
              Bargain price (₹)
              <input
                className="field"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 900"
                value={bargainPrice}
                onChange={(e) => setBargainPrice(e.target.value)}
              />
            </label>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--color-silk)" }}>{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting || rating === 0 || !title.trim()}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "var(--color-forest)" }}
            >
              {submitting
                ? <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Uploading…
                  </span>
                : "Submit Review"}
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
