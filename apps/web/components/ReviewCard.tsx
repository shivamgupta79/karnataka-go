export interface HotelReview {
  id: number;
  entity_id: string;
  rating: number;
  title: string;
  body?: string | null;
  price_paid?: number | null;
  bargain_price?: number | null;
  verified_traveller: boolean;
  helpful_count: number;
  created_at: string;
  display_name?: string;
  image_urls?: string[] | null;
}

export interface FoodReview {
  id: number;
  restaurant_id: string;
  dish_name?: string | null;
  rating: number;
  title: string;
  body?: string | null;
  price_paid?: number | null;
  bargain_price?: number | null;
  verified_traveller: boolean;
  helpful_count: number;
  created_at: string;
  display_name?: string;
  image_urls?: string[] | null;
}

interface Props {
  review: HotelReview | FoodReview;
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function StarRating({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < rating ? "#d97706" : "#d1d5db" }}>
          {i < rating ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

export default function ReviewCard({ review }: Props) {
  const dishName  = "dish_name" in review ? review.dish_name : null;
  const imgUrls   = review.image_urls ?? [];

  return (
    <div className="card p-4 space-y-2">
      {/* Header: stars + name */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <StarRating rating={review.rating} />
          <p className="font-semibold mt-0.5">{review.title}</p>
        </div>
        {review.display_name && (
          <span className="text-xs opacity-50">{review.display_name}</span>
        )}
      </div>

      {/* Dish name (food reviews) */}
      {dishName && (
        <p className="text-xs font-medium" style={{ color: "var(--color-saffron)" }}>
          🍽 {dishName}
        </p>
      )}

      {/* Body */}
      {review.body && (
        <p className="text-sm opacity-75 leading-relaxed">{review.body}</p>
      )}

      {/* Review photos */}
      {imgUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {imgUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border"
              style={{ width: 72, height: 72, borderColor: "var(--color-temple-2)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
            </a>
          ))}
        </div>
      )}

      {/* Price info */}
      <div className="flex flex-wrap gap-2 text-xs">
        {review.price_paid != null && (
          <span
            className="rounded-full px-2 py-0.5 font-medium"
            style={{ background: "rgba(217,119,6,0.1)", color: "#92400e" }}
          >
            💰 Paid {inr(review.price_paid)}
          </span>
        )}
        {review.bargain_price != null && (
          <span
            className="rounded-full px-2 py-0.5 font-medium"
            style={{ background: "rgba(26,107,71,0.1)", color: "var(--color-forest)" }}
          >
            🤝 Bargain {inr(review.bargain_price)}
          </span>
        )}
      </div>

      {/* Footer: verified badge + helpful count */}
      <div className="flex items-center gap-3 text-xs pt-1 border-t" style={{ borderColor: "var(--color-temple-2)" }}>
        {review.verified_traveller && (
          <span className="font-semibold" style={{ color: "var(--color-forest)" }}>
            ✓ Verified traveller
          </span>
        )}
        {review.helpful_count > 0 && (
          <span className="opacity-55">👍 {review.helpful_count} found helpful</span>
        )}
        <span className="ml-auto opacity-40">
          {new Date(review.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}
