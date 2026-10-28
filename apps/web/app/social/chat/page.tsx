"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { maskContacts } from "@/lib/mask";

interface ConvMember {
  user_id: string;
}

interface LastMessage {
  body: string;
  created_at: string;
  sender_id: string;
}

interface Conversation {
  id: string;
  type: "dm" | "group" | "trip";
  name: string | null;
  conversation_members: ConvMember[];
  last_message: LastMessage | null;
  unread: boolean;
  is_muted: boolean;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ChatListPage() {
  const { user, loading, configured } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (loading || !user) { setFetching(false); return; }

    async function loadConversations() {
      try {
        // Load conversations and muted_ids in parallel
        const [convsRes, muteRes] = await Promise.all([
          fetch("/api/social/conversations"),
          fetch("/api/social/mute"),
        ]);

        const convsJson = convsRes.ok ? await convsRes.json() : { conversations: [] };
        const muteJson = muteRes.ok ? await muteRes.json() : { muted_ids: [] };

        const rawConvs: Omit<Conversation, "last_message" | "unread" | "is_muted">[] =
          convsJson.conversations ?? [];
        const mutedSet = new Set<string>((muteJson.muted_ids ?? []) as string[]);

        // Build initial list without last messages
        const initialConvs: Conversation[] = rawConvs.map((c) => {
          // For DMs, check if the other member is muted
          const otherMembers = c.conversation_members
            .filter((m) => m.user_id !== user?.id)
            .map((m) => m.user_id);
          const isMuted =
            c.type === "dm" && otherMembers.some((uid) => mutedSet.has(uid));

          return {
            ...c,
            last_message: null,
            unread: false,
            is_muted: isMuted,
          };
        });

        setConvs(initialConvs);
        setFetching(false);

        // Lazily fetch last message for each conversation
        if (initialConvs.length === 0) return;

        const lastMsgPromises = initialConvs.map(async (conv) => {
          try {
            const r = await fetch(
              `/api/social/conversations/${conv.id}/messages`
            );
            if (!r.ok) return { id: conv.id, last_message: null };
            const j = await r.json();
            const msgs: Array<{ id: number; sender_id: string; body: string; created_at: string }> =
              j.messages ?? [];
            if (msgs.length === 0) return { id: conv.id, last_message: null };
            const last = msgs[msgs.length - 1];
            return {
              id: conv.id,
              last_message: {
                body: last.body,
                created_at: last.created_at,
                sender_id: last.sender_id,
              } as LastMessage,
            };
          } catch {
            return { id: conv.id, last_message: null };
          }
        });

        const lastMsgResults = await Promise.all(lastMsgPromises);
        const lastMsgMap = new Map(
          lastMsgResults.map((r) => [r.id, r.last_message])
        );

        setConvs((prev) =>
          prev.map((c) => ({
            ...c,
            last_message: lastMsgMap.get(c.id) ?? null,
          }))
        );
      } catch {
        setFetching(false);
      }
    }

    loadConversations();
  }, [user, loading]);

  async function createConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    const r = await fetch("/api/social/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "group",
        name: newName.trim() || undefined,
        member_ids: [user.id],
      }),
    });
    if (r.ok) {
      const j = await r.json();
      const newConv: Conversation = {
        id: j.id,
        type: "group",
        name: newName.trim() || null,
        conversation_members: [{ user_id: user.id }],
        last_message: null,
        unread: false,
        is_muted: false,
      };
      setConvs((prev) => [newConv, ...prev]);
      setNewName("");
      setShowNew(false);
    }
    setCreating(false);
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
          <code className="font-mono bg-black/10 px-1 rounded">.env.local</code> to enable messaging.
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
        <h1 className="text-xl font-bold">Sign in to access messages</h1>
        <p className="text-sm opacity-60">Create a free account to chat with other travellers.</p>
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
            💬 Messages
          </h1>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--color-saffron)" }}
        >
          + New Chat
        </button>
      </div>

      {/* New chat form */}
      {showNew && (
        <form onSubmit={createConversation} className="card p-4 space-y-3">
          <p className="text-sm font-semibold">Start a new group chat</p>
          <input
            className="field"
            type="text"
            placeholder="Chat name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--color-forest)" }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="rounded-xl px-4 py-2 text-sm font-semibold opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Conversation list */}
      {convs.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <p className="text-4xl">💬</p>
          <p className="font-semibold">No conversations yet</p>
          <p className="text-sm opacity-55">Start a new chat to connect with other travellers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {convs.map((conv) => {
            const label = conv.name ?? (conv.type === "dm" ? "1-to-1 Chat" : "Group Chat");
            const preview = conv.last_message
              ? maskContacts(conv.last_message.body).text.slice(0, 60) +
                (conv.last_message.body.length > 60 ? "…" : "")
              : "Tap to view messages";
            const timeLabel = conv.last_message
              ? relativeTime(conv.last_message.created_at)
              : null;

            return (
              <Link
                key={conv.id}
                href={`/social/chat/${conv.id}`}
                className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <div className="text-2xl">{conv.is_muted ? "🔇" : "💬"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{label}</p>
                    {conv.unread && (
                      <span
                        className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                        style={{ background: "var(--color-saffron)" }}
                        aria-label="Unread messages"
                      />
                    )}
                  </div>
                  <p className="text-xs opacity-50 mt-0.5 truncate">{preview}</p>
                  {timeLabel && (
                    <p className="text-xs opacity-40 mt-0.5">{timeLabel}</p>
                  )}
                </div>
                <span className="text-xs opacity-40">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
