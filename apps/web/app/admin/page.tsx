"use client";
import { useEffect, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  users: number; trips: number; reviews: number;
  openSOS: number; kycPending: number; openReports: number;
}
interface User {
  user_id: string; username: string; display_name: string;
  avatar_url: string | null; kyc_status: string;
}
interface SOSEvent {
  id: number; user_id: string | null; display_name: string;
  lat: number | null; lng: number | null;
  message: string | null; status: string; created_at: string;
}
interface Report {
  id: number; reporter_id: string; message_id: number;
  reason: string; auto_actioned: boolean; created_at: string;
}

const inr = (n: number) => n.toLocaleString("en-IN");

// ── Auth gate ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");

  async function tryAuth(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/stats", { headers: { "x-admin-secret": secret } });
    if (r.ok) { setAuthed(true); setAuthErr(""); }
    else setAuthErr("Wrong admin secret.");
  }

  if (!authed) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <form onSubmit={tryAuth} className="card p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-extrabold" style={{ color: "var(--color-forest)" }}>🛡 Admin Login</h1>
        <input type="password" className="field" placeholder="Admin secret"
          value={secret} onChange={(e) => setSecret(e.target.value)} autoFocus />
        {authErr && <p className="text-sm" style={{ color: "var(--color-silk)" }}>{authErr}</p>}
        <button type="submit" className="submit-btn">Enter</button>
      </form>
    </div>
  );

  return <Dashboard secret={secret} />;
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ secret }: { secret: string }) {
  const headers = { "x-admin-secret": secret };

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [users,   setUsers]   = useState<User[]>([]);
  const [sos,     setSos]     = useState<SOSEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [search,  setSearch]  = useState("");
  const [tab,     setTab]     = useState<"overview"|"users"|"sos"|"reports">("overview");
  const [busy,    setBusy]    = useState<string | null>(null);
  const [toast,   setToast]   = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    const [s, u, so, r] = await Promise.all([
      fetch("/api/admin/stats",   { headers }).then((r) => r.json()),
      fetch("/api/admin/users",   { headers }).then((r) => r.json()),
      fetch("/api/admin/sos",     { headers }).then((r) => r.json()),
      fetch("/api/admin/reports", { headers }).then((r) => r.json()),
    ]);
    setStats(s);
    setUsers(u.users ?? []);
    setSos(so.events ?? []);
    setReports(r.reports ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000); // auto-refresh every 15s
    return () => clearInterval(id);
  }, [load]);

  async function userAction(uid: string, action: string, extra?: Record<string, string>) {
    setBusy(uid + action);
    const r = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const j = await r.json();
    setBusy(null);
    if (r.ok) { showToast(`✓ ${j.action ?? action}`); load(); }
    else showToast(`Error: ${j.error}`);
  }

  async function resolveSOS(id: number) {
    setBusy(`sos${id}`);
    await fetch("/api/admin/sos", {
      method: "PATCH",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ id, status: "resolved" }),
    });
    setBusy(null);
    showToast("SOS resolved");
    load();
  }

  const filteredUsers = users.filter((u) =>
    !search || u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  const openSOS = sos.filter((e) => e.status === "open");

  const TABS = [
    { id: "overview", label: "Overview",  emoji: "📊" },
    { id: "users",    label: "Users",     emoji: "👥" },
    { id: "sos",      label: `SOS${openSOS.length ? ` (${openSOS.length})` : ""}`, emoji: "🚨" },
    { id: "reports",  label: `Reports${reports.filter(r=>!r.auto_actioned).length ? ` (${reports.filter(r=>!r.auto_actioned).length})` : ""}`, emoji: "🚩" },
  ] as const;

  return (
    <div className="max-w-5xl space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: "var(--color-forest)" }}>{toast}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>
            🛡 Admin Dashboard
          </h1>
          <p className="text-xs opacity-50 mt-0.5">Auto-refreshes every 15 s</p>
        </div>
        <button onClick={load}
          className="rounded-xl border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--color-temple-2)" }}>
          ↻ Refresh now
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className="rounded-xl px-3 py-1.5 text-sm font-semibold transition-all"
            style={tab === t.id
              ? { background: "var(--color-forest)", color: "#fff" }
              : { background: "var(--color-forest-3)", color: "var(--color-forest)" }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total users",      value: inr(stats.users),        emoji: "👥", color: "var(--color-forest)" },
            { label: "Saved trips",      value: inr(stats.trips),        emoji: "🗺",  color: "#0369a1" },
            { label: "Hotel reviews",    value: inr(stats.reviews),      emoji: "⭐", color: "#d97706" },
            { label: "Open SOS",         value: inr(stats.openSOS),      emoji: "🚨", color: stats.openSOS > 0 ? "#c0152e" : "inherit" },
            { label: "KYC pending",      value: inr(stats.kycPending),   emoji: "🪪", color: stats.kycPending > 0 ? "#d97706" : "inherit" },
            { label: "Open reports",     value: inr(stats.openReports),  emoji: "🚩", color: stats.openReports > 0 ? "#c0152e" : "inherit" },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-xs opacity-55 font-medium">{s.emoji} {s.label}</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div className="space-y-3">
          <input className="field max-w-sm" placeholder="Search by name or username…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-xs opacity-50">{filteredUsers.length} users shown</p>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <div key={u.user_id} className="card p-3 flex items-center gap-3 flex-wrap">
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: "var(--color-saffron)" }}>
                  {(u.display_name ?? "?")[0]?.toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.display_name}</p>
                  <p className="text-xs opacity-50">@{u.username}</p>
                </div>
                {/* KYC badge */}
                <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                  style={{
                    background: u.kyc_status === "verified" ? "rgba(26,107,71,0.1)" : "rgba(217,119,6,0.1)",
                    color: u.kyc_status === "verified" ? "var(--color-forest)" : "#92400e",
                  }}>
                  🪪 {u.kyc_status}
                </span>
                {/* Actions */}
                <div className="flex gap-1.5 flex-wrap">
                  {u.kyc_status === "pending" && (
                    <>
                      <button disabled={busy === u.user_id + "approve_kyc"}
                        onClick={() => userAction(u.user_id, "approve_kyc", { doc_type: "aadhaar" })}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        style={{ background: "var(--color-forest)" }}>
                        ✓ Approve KYC
                      </button>
                      <button disabled={busy === u.user_id + "reject_kyc"}
                        onClick={() => userAction(u.user_id, "reject_kyc", { doc_type: "aadhaar" })}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        style={{ background: "var(--color-silk)" }}>
                        ✗ Reject KYC
                      </button>
                    </>
                  )}
                  <button disabled={busy === u.user_id + "unblock_otp"}
                    onClick={() => userAction(u.user_id, "unblock_otp")}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border disabled:opacity-50"
                    style={{ borderColor: "var(--color-temple-2)", color: "#0369a1" }}>
                    🔓 Unblock OTP
                  </button>
                  <button disabled={busy === u.user_id + "ban"}
                    onClick={() => { if (confirm(`Ban ${u.display_name}?`)) userAction(u.user_id, "ban"); }}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border disabled:opacity-50"
                    style={{ borderColor: "var(--color-silk)", color: "var(--color-silk)" }}>
                    🚫 Ban
                  </button>
                  <button disabled={busy === u.user_id + "unban"}
                    onClick={() => userAction(u.user_id, "unban")}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border disabled:opacity-50"
                    style={{ borderColor: "var(--color-forest)", color: "var(--color-forest)" }}>
                    ✓ Unban
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SOS ── */}
      {tab === "sos" && (
        <div className="space-y-3">
          {sos.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-semibold">No SOS events</p>
            </div>
          )}
          {sos.map((e) => (
            <div key={e.id}
              className="card p-4 space-y-2 border-l-4"
              style={{ borderColor: e.status === "open" ? "#c0152e" : "#d1d5db" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-bold">{e.display_name}</p>
                  <p className="text-xs opacity-50">{new Date(e.created_at).toLocaleString("en-IN")}</p>
                </div>
                <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                  style={{
                    background: e.status === "open" ? "rgba(192,21,46,0.1)" : "rgba(209,213,219,0.5)",
                    color: e.status === "open" ? "#c0152e" : "#6b7280",
                  }}>
                  {e.status === "open" ? "🚨 OPEN" : "✓ Resolved"}
                </span>
              </div>
              {e.message && <p className="text-sm">{e.message}</p>}
              {e.lat && e.lng && (
                <a href={`https://maps.google.com/?q=${e.lat},${e.lng}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs underline" style={{ color: "#0369a1" }}>
                  📍 View on map ({e.lat.toFixed(4)}, {e.lng.toFixed(4)})
                </a>
              )}
              {e.status === "open" && (
                <button disabled={busy === `sos${e.id}`}
                  onClick={() => resolveSOS(e.id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--color-forest)" }}>
                  {busy === `sos${e.id}` ? "…" : "✓ Mark resolved"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Reports ── */}
      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-semibold">No reports</p>
            </div>
          )}
          {reports.map((r) => (
            <div key={r.id} className="card p-4 flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold">Message #{r.message_id}</p>
                <p className="text-xs opacity-60">Reason: {r.reason}</p>
                <p className="text-xs opacity-40">{new Date(r.created_at).toLocaleString("en-IN")}</p>
              </div>
              {r.auto_actioned ? (
                <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                  style={{ background: "rgba(26,107,71,0.1)", color: "var(--color-forest)" }}>
                  ✓ Actioned
                </span>
              ) : (
                <button disabled={busy === `rep${r.id}`}
                  onClick={async () => {
                    setBusy(`rep${r.id}`);
                    await fetch("/api/admin/reports", {
                      method: "PATCH",
                      headers: { ...{ "x-admin-secret": secret }, "content-type": "application/json" },
                      body: JSON.stringify({ id: r.id, auto_actioned: true }),
                    });
                    setBusy(null);
                    load();
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--color-saffron)" }}>
                  Mark reviewed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
