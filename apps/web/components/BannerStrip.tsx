"use client";
import { useEffect, useState } from "react";

interface Banner {
  id: number;
  title: string;
  subtitle?: string | null;
  cta_label?: string | null;
  url?: string | null;
  image_url?: string | null;
  bg_color: string;
  text_color: string;
  type: "banner" | "ad" | "announcement";
  position: "top" | "bottom" | "inline";
  priority: number;
}

interface Props {
  position: "top" | "bottom" | "inline";
}

export default function BannerStrip({ position }: Props) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((j) => setBanners((j.banners ?? []).filter((b: Banner) => b.position === position)))
      .catch(() => {});
  }, [position]);

  const visible = banners.filter((b) => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {visible.map((b) => (
        <div
          key={b.id}
          className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: b.bg_color, color: b.text_color }}
          role="banner"
        >
          {/* Optional image */}
          {b.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.image_url} alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
          )}

          {/* Text */}
          <div className="flex-1 min-w-0">
            <span className="font-semibold">{b.title}</span>
            {b.subtitle && (
              <span className="ml-2 opacity-80 font-normal text-xs hidden sm:inline">
                {b.subtitle}
              </span>
            )}
          </div>

          {/* CTA */}
          {b.cta_label && b.url && (
            <a
              href={b.url}
              target={b.url.startsWith("http") ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-opacity hover:opacity-85"
              style={{ background: "rgba(0,0,0,0.2)", color: b.text_color }}
            >
              {b.cta_label} →
            </a>
          )}

          {/* Dismiss */}
          <button
            onClick={() => setDismissed((p) => new Set([...p, b.id]))}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none ml-1"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
