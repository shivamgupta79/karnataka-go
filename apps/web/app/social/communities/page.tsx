"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";

interface Community {
  id: number;
  name: string;
  description: string | null;
  type: string;
  owner_id: string;
  community_members: Array<{ count: number }>;
}

export default function CommunitiesPage() {
  const { user, loading, configured } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [fetching, setFetching] = useState(true);
  const [joined, setJoined] = useState<Set<number>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading || !user) { setFetching(false); return; }
    fetch("/api/social/communities")
      .then((r) => r.json())
      .then((j) => { setCommunities(j.communities ?? []); setFetching(false); })
      .catch(() => setFetching(false));
  }, [user, loading]);

  async function joinCommunity(id: number) {
    setJoined((prev) => new Set(prev).add(id));
    const r = await fetch(`/api/social/communities/${id}/join`, { method: "POST" });
    if (!r.ok) {
      setJoined((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function leaveCommunity(id: number) {
    setJoined((prev) => { const s = new Set(prev); s.delete(id); return s; });
    const r = await fetch(`/api/social/communities/${id}/join`, { method: "DELETE" });
    if (!r.ok) {
      setJoined((prev) => new Set(prev).add(id));
    }
  }

  async function createCommunity(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const r = await fetch("/api/social/communities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: "public",
      }),
    });
    if (r.ok) {
      const j = await r.json();
      const newComm: Community = {
        id: j.id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: "public",
        owner_id: user!.id,
        community_members: [{ count: 1 }],
      };
      setCommunities((prev) => [newComm, ...prev]);
      setJoined((prev) => new Set(prev).add(j.id));
      setForm({ name: "", description: "" });
      setShowCreate(false);
    }
    setSaving(false);
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || fetching) {
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
          communities.
        </p>
        <Link href="/" className="text-sm underline opacity-50">← Back to planner</Link>
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold">Sign in to access communities</h1>
        <p className="text-sm opacity-60">Join trip groups and connect with fellow travellers.</p>
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
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/social" className="text-sm opacity-50 hover:opacity-75 transition-opacity">
            ← Social
          </Link>
          <h1 className="text-2xl font-extrabold mt-1" style={{ color: "var(--color-forest)" }}>
            🏘 Communities
          </h1>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--color-saffron)" }}
        >
          + Create Community
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createCommunity} className="card p-4 space-y-3">
          <p className="text-sm font-semibold">Create a new community</p>
          <input
            className="field"
            type="text"
            placeholder="Community name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            maxLength={80}
          />
          <input
            className="field"
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            maxLength={300}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--color-forest)" }}
            >
              {saving ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl px-4 py-2 text-sm font-semibold opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Communities list */}
      {communities.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <p className="text-4xl">🏘</p>
          <p className="font-semibold">No communities yet</p>
          <p className="text-sm opacity-55">Be the first to create a trip community.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {communities.map((comm) => {
            const isOwner = comm.owner_id === user.id;
            const isJoined = joined.has(comm.id);
            const memberCount = comm.community_members[0]?.count ?? 0;
            return (
              <div key={comm.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">🏘</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold">{comm.name}</p>
                      {isOwner && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: "var(--color-forest-3)",
                            color: "var(--color-forest)",
                          }}
                        >
                          Your community
                        </span>
                      )}
                    </div>
                    {comm.description && (
                      <p className="text-sm opacity-70 mt-0.5">{comm.description}</p>
                    )}
                    <p className="text-xs opacity-50 mt-1">
                      {memberCount} member{memberCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {!isOwner && (
                    <button
                      onClick={() => (isJoined ? leaveCommunity(comm.id) : joinCommunity(comm.id))}
                      className="rounded-xl px-4 py-1.5 text-sm font-semibold text-white flex-shrink-0"
                      style={{ background: isJoined ? "var(--color-silk)" : "var(--color-forest)" }}
                    >
                      {isJoined ? "Leave" : "Join"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
