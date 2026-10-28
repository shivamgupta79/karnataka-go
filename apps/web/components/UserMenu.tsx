"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/useAuth";

export default function UserMenu() {
  const { user, loading, configured, signOut } = useAuth();
  const [open, setOpen]   = useState(false);
  const menuRef           = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Supabase not configured — render nothing (auth features unavailable)
  if (!configured) return null;

  if (loading) {
    return <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.2)" }} />;
  }

  if (!user) {
    return (
      <Link
        href="/auth"
        className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
        style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
      >
        Sign in
      </Link>
    );
  }

  // Prefer display_name from metadata, fall back to email prefix
  const displayName: string =
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-8 rounded-full font-bold text-sm flex items-center justify-center select-none"
        style={{ background: "var(--color-saffron)", color: "#fff" }}
        aria-label="User menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-40 card w-56 p-2 shadow-xl"
          style={{ minWidth: "14rem" }}>
          {/* User info */}
          <div className="px-3 py-2 mb-1">
            <p className="font-semibold text-sm truncate">{displayName}</p>
            <p className="text-xs opacity-50 truncate">{user.email}</p>
          </div>
          <div className="h-px my-1" style={{ background: "var(--color-temple-2)" }} />

          {/* Menu items */}
          <Link href="/profile" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--color-forest-3)]">
            👤 My Profile
          </Link>
          <Link href="/my-trips" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--color-forest-3)]">
            🗺 My saved trips
          </Link>
          <Link href="/" onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-[var(--color-forest-3)]">
            ✏️ Plan a new trip
          </Link>

          <div className="h-px my-1" style={{ background: "var(--color-temple-2)" }} />

          <button
            onClick={async () => { setOpen(false); await signOut(); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-colors hover:bg-red-50 dark:hover:bg-red-950"
            style={{ color: "var(--color-silk)" }}
          >
            ↩ Sign out
          </button>
        </div>
      )}
    </div>
  );
}
