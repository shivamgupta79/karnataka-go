"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { createClient } from "@/lib/supabase/client";
import QRScanner from "@/components/QRScanner";
import { verifyQR } from "@/lib/qr";

type MessageType = "text" | "itinerary_share" | "location" | "help_request";

interface Message {
  id: number;
  sender_id: string;
  sender_username?: string;
  body: string;
  created_at: string;
  message_type: MessageType;
}

interface ContextMenuState { x: number; y: number; msg: Message; }

const TYPE_OPTIONS: { value: MessageType; emoji: string; label: string }[] = [
  { value: "text",           emoji: "💬", label: "Text"      },
  { value: "help_request",   emoji: "🆘", label: "Help"      },
  { value: "location",       emoji: "📍", label: "Location"  },
  { value: "itinerary_share",emoji: "🗺", label: "Trip"      },
];

function typeIcon(t: MessageType): string {
  switch (t) {
    case "help_request":    return "🆘 ";
    case "location":        return "📍 ";
    case "itinerary_share": return "🗺 ";
    default: return "";
  }
}

function msgStyle(t: MessageType, isOwn: boolean): React.CSSProperties {
  if (t === "help_request")
    return { background: isOwn ? "#9f1239" : "#fff1f3", color: isOwn ? "#fff" : "#9f1239",
             border: isOwn ? "none" : "1px solid #fca5a5" };
  if (t === "location")
    return { background: isOwn ? "#0369a1" : "#eff6ff", color: isOwn ? "#fff" : "#0369a1",
             border: isOwn ? "none" : "1px solid #bfdbfe" };
  if (t === "itinerary_share")
    return { background: isOwn ? "#7c3aed" : "#f5f3ff", color: isOwn ? "#fff" : "#7c3aed",
             border: isOwn ? "none" : "1px solid #ddd6fe" };
  return {
    background: isOwn ? "var(--color-forest)" : "#ffffff",
    color: isOwn ? "#ffffff" : "#1c1917",
    border: isOwn ? "none" : "1px solid var(--color-temple-2)",
  };
}

export default function ChatThreadPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params?.id as string;
  const { user, loading, configured } = useAuth();

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [blockedIds,  setBlockedIds]  = useState<Set<string>>(new Set());
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [text,        setText]        = useState("");
  const [sending,     setSending]     = useState(false);
  const [error,       setError]       = useState("");
  const [msgType,     setMsgType]     = useState<MessageType>("text");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [reporting,   setReporting]   = useState(false);
  const [showQRScan,  setShowQRScan]  = useState(false);

  // Message-request state: first-time chat acceptance
  const [requestState, setRequestState]   = useState<"unknown"|"accepted"|"pending">("unknown");
  const [requestChecked, setRequestChecked] = useState(false);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const r = await fetch(`/api/social/conversations/${id}/messages`);
      if (!r.ok) return;
      const j = await r.json();
      setMessages(j.messages ?? []);
    } catch { /* ignore */ }
  }, [id]);

  // Load blocked IDs + member usernames
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/social/block").then((r) => r.json()).catch(() => ({ blocked_ids: [] })),
      fetch(`/api/social/conversations/${id}/members`).then((r) => r.json()).catch(() => ({ members: [] })),
    ]).then(([blockData, memberData]) => {
      if (Array.isArray(blockData.blocked_ids))
        setBlockedIds(new Set(blockData.blocked_ids as string[]));
      if (Array.isArray(memberData.members)) {
        const map: Record<string, string> = {};
        for (const m of memberData.members as { user_id: string; username: string }[])
          map[m.user_id] = m.username ?? "traveller";
        setMemberNames(map);
      }
    });
  }, [user, id]);

  // Check message-request status: if we have no messages yet and the other
  // person initiated, show accept/decline bar
  useEffect(() => {
    if (!user || requestChecked) return;
    fetchMessages().then(() => {
      setRequestChecked(true);
    });
  }, [user, requestChecked, fetchMessages]);

  useEffect(() => {
    if (!requestChecked) return;
    if (messages.length === 0) { setRequestState("accepted"); return; }
    const firstSender = messages[0]?.sender_id;
    if (firstSender && firstSender !== user?.id)
      setRequestState("pending");
    else
      setRequestState("accepted");
  }, [requestChecked, messages, user]);

  // Realtime + polling fallback
  useEffect(() => {
    if (!id || !user) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    fetchMessages();

    const sb = createClient();
    let channel: ReturnType<NonNullable<typeof sb>["channel"]> | undefined;
    if (sb) {
      channel = sb.channel("chat:" + id)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages",
              filter: "conversation_id=eq." + id },
          (payload) => {
            setMessages((prev) => {
              const nm = payload.new as Message;
              if (prev.some((m) => m.id === nm.id)) return prev;
              return [...prev, nm];
            });
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          })
        .subscribe((status) => {
          if (status === "CLOSED" || status === "CHANNEL_ERROR")
            if (!interval) interval = setInterval(fetchMessages, 5000);
        });
    } else {
      interval = setInterval(fetchMessages, 5000);
    }
    return () => { channel?.unsubscribe(); if (interval) clearInterval(interval); };
  }, [id, user, fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node))
        setContextMenu(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true); setError("");
    const r = await fetch(`/api/social/conversations/${id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: text.trim(), message_type: msgType }),
    });
    if (!r.ok) setError("Failed to send. Please try again.");
    else { setText(""); await fetchMessages(); setRequestState("accepted"); }
    setSending(false);
  }

  function shareLocation() {
    if (!navigator.geolocation) { setError("Location not available on this device."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat  = pos.coords.latitude.toFixed(4);
        const lng  = pos.coords.longitude.toFixed(4);
        const body = `📍 My approximate location: ${lat}, ${lng} (±${Math.round(pos.coords.accuracy)}m)`;
        setText(body);
        setMsgType("location");
      },
      () => setError("Location permission denied."),
      { timeout: 8000 }
    );
  }

  function shareTripPlan() {
    try {
      const plan = sessionStorage.getItem("karnataka-go:trip");
      if (!plan) { setError("No trip plan found. Generate a plan first from the home page."); return; }
      const p = JSON.parse(plan);
      const days   = (p.days ?? []).length;
      const places = (p.places ?? []).map((pl: { name: string }) => pl.name).slice(0, 4).join(", ");
      const cost   = p.cost?.total ? `₹${Math.round(p.cost.total).toLocaleString("en-IN")}` : "";
      setText(`🗺 Sharing my ${days}-day Karnataka trip plan: ${places}${cost ? ` · ${cost} total` : ""}. Ask me for the full itinerary!`);
      setMsgType("itinerary_share");
    } catch { setError("Could not read trip plan."); }
  }

  async function handleReport(msg: Message) {
    setContextMenu(null); setReporting(true);
    const reason = prompt("Reason for report:");
    if (!reason?.trim()) { setReporting(false); return; }
    await fetch("/api/social/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message_id: msg.id, reason: reason.trim() }),
    });
    setReporting(false);
    alert("Report submitted. Thank you.");
  }

  async function handleBlock(msg: Message) {
    setContextMenu(null);
    const r = await fetch("/api/social/block", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blocked_id: msg.sender_id }),
    });
    if (r.ok) setBlockedIds((prev) => new Set([...prev, msg.sender_id]));
  }

  // QR scan → connect to another user → navigate to their DM
  async function handleQRConnect(token: string) {
    setShowQRScan(false);
    const result = await verifyQR(token);
    if (!result.ok) { setError(result.error); return; }
    const r = await fetch("/api/social/conversations/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target_uid: result.payload.uid }),
    });
    const j = await r.json();
    if (!r.ok) { setError(j.error ?? "Could not connect"); return; }
    router.push(`/social/chat/${j.conversationId}`);
  }

  // ── Auth guards ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4"
        style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }} />
    </div>
  );
  if (!configured) return (
    <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
      <p className="text-4xl">🔧</p><h1 className="text-xl font-bold">Auth not configured</h1>
      <Link href="/" className="text-sm underline opacity-50">← Back</Link>
    </div>
  );
  if (!user) return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="text-4xl">🔒</p><h1 className="text-xl font-bold">Sign in to chat</h1>
      <Link href="/auth" className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
        style={{ background: "var(--color-forest)" }}>Sign in →</Link>
    </div>
  );

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl flex flex-col" style={{ height: "calc(100vh - 120px)" }}>

      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b flex-wrap"
        style={{ borderColor: "var(--color-temple-2)" }}>
        <Link href="/social/chat" className="text-sm opacity-50 hover:opacity-75 transition-opacity">← Back</Link>
        <h1 className="text-lg font-bold flex-1" style={{ color: "var(--color-forest)" }}>
          Chat
        </h1>
        {/* QR connect button */}
        <button
          onClick={() => setShowQRScan(true)}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all"
          style={{ borderColor: "var(--color-forest)", color: "var(--color-forest)" }}
          title="Scan another traveller's QR code to connect"
        >
          📷 Scan QR to connect
        </button>
      </div>

      {/* Message-request banner */}
      {requestState === "pending" && (
        <div className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl my-2"
          style={{ background: "var(--color-saffron-3)", border: "1px solid rgba(217,119,6,0.3)" }}>
          <span className="font-semibold flex-1" style={{ color: "#92400e" }}>
            💬 You have a message request from this traveller
          </span>
          <button
            onClick={() => setRequestState("accepted")}
            className="rounded-lg px-3 py-1 text-xs font-bold text-white"
            style={{ background: "var(--color-forest)" }}
          >Accept</button>
          <button
            onClick={() => router.push("/social/chat")}
            className="rounded-lg px-3 py-1 text-xs font-semibold opacity-60"
          >Decline</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm opacity-40 py-8">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const isOwn      = msg.sender_id === user?.id;
          const isBlocked  = blockedIds.has(msg.sender_id);
          const isHidden   = !isBlocked && msg.body.includes("[hidden]");
          const isRemoved  = msg.body === "[removed by automated moderation]";
          const senderName = isOwn ? "You" : (memberNames[msg.sender_id] ?? "Traveller");

          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
              {/* Username label */}
              <span className="text-xs opacity-40 mb-0.5 px-1">{senderName}</span>
              <div
                className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm cursor-context-menu
                  ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"}`}
                style={msgStyle(msg.message_type, isOwn)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, msg }); }}
              >
                {isBlocked  ? <span className="italic opacity-50">[message from blocked user]</span>
                : isHidden  ? <span className="italic opacity-50">[contact info hidden]</span>
                : isRemoved ? <span className="italic opacity-50">[removed by moderation]</span>
                : <>{typeIcon(msg.message_type)}{msg.body}</>}
              </div>
              <span className="text-xs opacity-30 mt-0.5 px-1">
                {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div ref={contextMenuRef}
          className="fixed z-50 rounded-xl shadow-xl overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x, background: "#fff",
                   border: "1px solid var(--color-temple-2)", minWidth: 160 }}>
          <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
            onClick={() => handleReport(contextMenu.msg)} disabled={reporting}>
            🚩 Report
          </button>
          {contextMenu.msg.sender_id !== user?.id && (
            <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
              onClick={() => handleBlock(contextMenu.msg)}>
              🚫 Block sender
            </button>
          )}
          <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
            onClick={async () => { setContextMenu(null); await navigator.clipboard.writeText(contextMenu.msg.body).catch(() => {}); }}>
            📋 Copy
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-center mb-1" style={{ color: "var(--color-silk)" }}>{error}</p>
      )}

      {/* Message type + action buttons */}
      <div className="flex gap-1.5 pt-2 flex-wrap">
        {TYPE_OPTIONS.map((opt) => (
          <button key={opt.value} type="button"
            onClick={() => setMsgType(opt.value)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all"
            style={{
              border: msgType === opt.value ? "2px solid var(--color-forest)" : "2px solid transparent",
              background: msgType === opt.value ? "var(--color-forest)" : "#f3f4f6",
              color: msgType === opt.value ? "#fff" : "#374151",
            }}>
            {opt.emoji} {opt.label}
          </button>
        ))}
        <button onClick={shareLocation}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all hover:opacity-80"
          style={{ borderColor: "#0369a1", color: "#0369a1", background: "#eff6ff" }}
          title="Share my location">
          📍 Share location
        </button>
        <button onClick={shareTripPlan}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all hover:opacity-80"
          style={{ borderColor: "#7c3aed", color: "#7c3aed", background: "#f5f3ff" }}
          title="Share my trip plan">
          🗺 Share trip
        </button>
      </div>

      {/* Input */}
      <form onSubmit={sendMessage}
        className="flex gap-2 pt-2 border-t mt-1"
        style={{ borderColor: "var(--color-temple-2)" }}>
        <input
          className="field flex-1"
          type="text"
          placeholder={requestState === "pending" ? "Accept the request to reply…" : "Type a message…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          disabled={sending || requestState === "pending"}
        />
        <button
          type="submit"
          disabled={sending || !text.trim() || requestState === "pending"}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--color-forest)" }}>
          {sending ? "…" : "Send"}
        </button>
      </form>

      {/* QR Scanner modal */}
      {showQRScan && (
        <QRScanner
          onClose={() => setShowQRScan(false)}
          onVerified={handleQRConnect}
        />
      )}
    </div>
  );
}
