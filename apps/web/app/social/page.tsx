"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import ShareModal from "@/components/ShareModal";

export default function SocialPage() {
  const { user, loading, configured } = useAuth();
  const [showShare, setShowShare] = useState(false);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4"
          style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // ── Auth not configured ──────────────────────────────────────────────────
  if (!configured) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
        <p className="text-4xl">🔧</p>
        <h1 className="text-xl font-bold">Auth not configured</h1>
        <p className="text-sm opacity-60 leading-relaxed">
          Add Supabase credentials to{" "}
          <code className="font-mono bg-black/10 px-1 rounded">.env.local</code> to enable
          social features and accounts.
        </p>
        <Link
          href="/auth"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}
        >
          Setup guide →
        </Link>
        <Link href="/" className="text-sm underline opacity-50">
          ← Back to planner
        </Link>
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold">Sign in to access social features</h1>
        <p className="text-sm opacity-60">
          Create a free account to chat, join communities and share travel journals.
        </p>
        <Link
          href="/auth"
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--color-forest)" }}
        >
          Sign in or sign up →
        </Link>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>
          🌿 Social
        </h1>
        <p className="text-sm opacity-60 mt-1">
          Connect with fellow Karnataka travellers, share tips and journals.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Messages */}
        <Link href="/social/chat" className="card p-6 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow">
          <span className="text-4xl">💬</span>
          <p className="font-bold text-sm">Messages</p>
          <p className="text-xs opacity-55 leading-snug">Private 1-to-1 and group chats</p>
        </Link>

        {/* Communities */}
        <Link href="/social/communities" className="card p-6 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow">
          <span className="text-4xl">🏘</span>
          <p className="font-bold text-sm">Communities</p>
          <p className="text-xs opacity-55 leading-snug">Join trip groups &amp; communities</p>
        </Link>

        {/* Journals */}
        <Link href="/social/journals" className="card p-6 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow">
          <span className="text-4xl">📖</span>
          <p className="font-bold text-sm">Journals</p>
          <p className="text-xs opacity-55 leading-snug">Past traveller advice &amp; trip journals</p>
        </Link>

        {/* Share */}
        <button
          onClick={() => setShowShare(true)}
          className="card p-6 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow w-full"
        >
          <span className="text-4xl">📤</span>
          <p className="font-bold text-sm">Share</p>
          <p className="text-xs opacity-55 leading-snug">Share this app with friends</p>
        </button>
      </div>

      {showShare && (
        <ShareModal
          title="KarnatakaGo — AI travel planner for Karnataka"
          url={typeof window !== "undefined" ? window.location.origin : ""}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
