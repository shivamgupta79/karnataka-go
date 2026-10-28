"use client";

export type BadgeStatus = "verified" | "unverified" | "pending" | "not_added";

interface VerificationBadgeProps {
  status: BadgeStatus;
  label?: string;
}

const CONFIG: Record<
  BadgeStatus,
  { emoji: string; text: string; color: string; bg: string }
> = {
  verified: { emoji: "✅", text: "Verified", color: "#065f46", bg: "#d1fae5" },
  unverified: {
    emoji: "⚠️",
    text: "Unverified",
    color: "#78350f",
    bg: "#fef3c7",
  },
  pending: {
    emoji: "🕐",
    text: "Pending review",
    color: "#1e40af",
    bg: "#dbeafe",
  },
  not_added: {
    emoji: "➕",
    text: "Not added",
    color: "#6b7280",
    bg: "#f3f4f6",
  },
};

export default function VerificationBadge({
  status,
  label,
}: VerificationBadgeProps) {
  const cfg = CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.emoji} {label ?? cfg.text}
    </span>
  );
}
