"use client";
import { useEffect, useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  users: number; trips: number; reviews: number; openSOS: number;
  kycPending: number; openReports: number; pendingReviews: number;
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
interface Banner {
  id: number; title: string; subtitle?: string | null;
  cta_label?: string | null; url?: string | null; image_url?: string | null;
  bg_color: string; text_color: string;
  type: "banner" | "ad" | "announcement";
  position: "top" | "bottom" | "inline";
  active: boolean; priority: number;
  starts_at?: string | null; ends_at?: string | null;
}
interface KycItem {
  id: number; user_id: string; display_name: string;
  doc_type: string; status: string; uploaded_at: string;
  signed_url: string | null;
}
interface Review {
  id: number; user_id: string; display_name: string;
  rating: number; title: string; body?: string | null;
  price_paid?: number | null; bargain_price?: number | null;
  image_urls?: string[] | null; verified_traveller: boolean;
  created_at: string;
  entity_id?: string; restaurant_id?: string; dish_name?: string | null;
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
    if (r.ok) {
      // Set a session cookie so the middleware admin guard recognises this browser
      // Cookie is httpOnly=false (JS-set) but scoped to path=/admin, SameSite=Strict
      document.cookie = `admin_secret=${encodeURIComponent(secret)}; path=/admin; SameSite=Strict`;
      setAuthed(true);
      setAuthErr("");
    } else {
      setAuthErr("Wrong admin secret.");
    }
  }

  if (!authed) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <form onSubmit={tryAuth} className="card p-8 w-full max-w-sm space-y-4">
        <div className="text-center space-y-1">
          <p className="text-4xl">🛡</p>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--color-forest)" }}>Admin Dashboard</h1>
          <p className="text-xs opacity-50">KarnatakaGo · Admin access only</p>
        </div>
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
  const H = { "x-admin-secret": secret };

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [users,   setUsers]   = useState<User[]>([]);
  const [sos,     setSos]     = useState<SOSEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [kycs,    setKycs]    = useState<KycItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [search,     setSearch]     = useState("");
  const [tab,        setTab]        = useState<
    "overview"|"users"|"sos"|"reports"|"banners"|"kyc"|"reviews"
  >("overview");
  const [reviewType, setReviewType] = useState<"hotel"|"food">("hotel");
  const [busy,       setBusy]       = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  // Banner form state
  const [bannerForm, setBannerForm] = useState<Partial<Banner & { id?: number }>>({
    title: "", subtitle: "", cta_label: "", url: "", image_url: "",
    bg_color: "#1a6b47", text_color: "#ffffff",
    type: "banner", position: "top", active: true, priority: 0,
  });
  const [editingBannerId, setEditingBannerId] = useState<number | null>(null);
  const [showBannerForm, setShowBannerForm] = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    const [s, u, so, r, b, k] = await Promise.all([
      fetch("/api/admin/stats",   { headers: H }).then((r) => r.json()),
      fetch("/api/admin/users",   { headers: H }).then((r) => r.json()),
      fetch("/api/admin/sos",     { headers: H }).then((r) => r.json()),
      fetch("/api/admin/reports", { headers: H }).then((r) => r.json()),
      fetch("/api/admin/banners", { headers: H }).then((r) => r.json()),
      fetch("/api/admin/kyc",     { headers: H }).then((r) => r.json()),
    ]);
    setStats(s); setUsers(u.users ?? []); setSos(so.events ?? []);
    setReports(r.reports ?? []); setBanners(b.banners ?? []); setKycs(k.kycs ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  const loadReviews = useCallback(async (type: "hotel" | "food") => {
    const r = await fetch(`/api/admin/reviews?type=${type}`, { headers: H }).then((r) => r.json());
    setReviews(r.reviews ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  useEffect(() => { load(); const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);
  useEffect(() => { if (tab === "reviews") loadReviews(reviewType); }, [tab, reviewType, loadReviews]);

  // ── User actions ─────────────────────────────────────────────────────────
  async function userAction(uid: string, action: string, extra?: Record<string, string>) {
    setBusy(uid + action);
    const r = await fetch(`/api/admin/users/${uid}`, {
      method: "PATCH",
      headers: { ...H, "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const j = await r.json();
    setBusy(null);
    if (r.ok) { showToast(`✓ ${j.action ?? action}`); load(); }
    else showToast(`Error: ${j.error}`, false);
  }

  // ── KYC actions ──────────────────────────────────────────────────────────
  async function kycAction(item: KycItem, status: "verified" | "rejected") {
    setBusy(`kyc${item.id}`);
    const r = await fetch("/api/admin/kyc", {
      method: "PATCH",
      headers: { ...H, "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, user_id: item.user_id, doc_type: item.doc_type, status }),
    });
    setBusy(null);
    if (r.ok) { showToast(`✓ KYC ${status}`); load(); setKycs((p) => p.filter((k) => k.id !== item.id)); }
    else showToast("KYC update failed", false);
  }

  // ── Review actions ───────────────────────────────────────────────────────
  async function reviewAction(id: number, type: "hotel" | "food", approved: boolean) {
    setBusy(`rev${id}`);
    const r = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { ...H, "content-type": "application/json" },
      body: JSON.stringify({ id, type, approved }),
    });
    setBusy(null);
    if (r.ok) {
      showToast(approved ? "✓ Review published" : "✗ Review rejected");
      setReviews((p) => p.filter((rv) => rv.id !== id));
    } else showToast("Failed", false);
  }

  // ── Banner actions ───────────────────────────────────────────────────────
  async function saveBanner() {
    const method = editingBannerId ? "PATCH" : "POST";
    const url    = editingBannerId ? `/api/admin/banners/${editingBannerId}` : "/api/admin/banners";
    setBusy("banner_save");
    const r = await fetch(url, {
      method,
      headers: { ...H, "content-type": "application/json" },
      body: JSON.stringify(bannerForm),
    });
    setBusy(null);
    if (r.ok) {
      showToast(editingBannerId ? "✓ Banner updated" : "✓ Banner created");
      setShowBannerForm(false); setEditingBannerId(null);
      setBannerForm({ title:"",subtitle:"",cta_label:"",url:"",image_url:"",
        bg_color:"#1a6b47",text_color:"#ffffff",type:"banner",position:"top",active:true,priority:0 });
      load();
    } else showToast("Failed to save banner", false);
  }

  async function deleteBanner(id: number) {
    if (!confirm("Delete this banner?")) return;
    setBusy(`del${id}`);
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE", headers: H });
    setBusy(null); showToast("✓ Deleted"); load();
  }

  async function toggleBanner(b: Banner) {
    setBusy(`tog${b.id}`);
    await fetch(`/api/admin/banners/${b.id}`, {
      method: "PATCH",
      headers: { ...H, "content-type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    setBusy(null); load();
  }

  function startEdit(b: Banner) {
    setEditingBannerId(b.id);
    setBannerForm({ ...b });
    setShowBannerForm(true);
  }

  const filteredUsers = users.filter((u) =>
    !search || u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );
  const openSOS = sos.filter((e) => e.status === "open");

  const TABS = [
    { id: "overview", label: "Overview",   emoji: "📊" },
    { id: "banners",  label: `Banners (${banners.length})`, emoji: "📢" },
    { id: "kyc",      label: `KYC${kycs.length ? ` (${kycs.length})` : ""}`, emoji: "🪪" },
    { id: "reviews",  label: `Reviews${reviews.filter(r=>!r.verified_traveller).length ? ` (${reviews.filter(r=>!r.verified_traveller).length})` : ""}`, emoji: "⭐" },
    { id: "users",    label: "Users",      emoji: "👥" },
    { id: "sos",      label: `SOS${openSOS.length ? ` (${openSOS.length})` : ""}`, emoji: "🚨" },
    { id: "reports",  label: `Reports${reports.filter(r=>!r.auto_actioned).length ? ` (${reports.filter(r=>!r.auto_actioned).length})` : ""}`, emoji: "🚩" },
  ] as const;

  return (
    <div className="max-w-5xl space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
          style={{ background: toast.ok ? "var(--color-forest)" : "var(--color-silk)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>🛡 Admin Dashboard</h1>
          <p className="text-xs opacity-50 mt-0.5">KarnatakaGo · Auto-refreshes every 30s</p>
        </div>
        <button onClick={load} className="rounded-xl border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: "var(--color-temple-2)" }}>↻ Refresh</button>
      </div>

      {/* Tabs */}
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

      {/* ════ OVERVIEW ════ */}
      {tab === "overview" && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Users",            value: inr(stats.users),          emoji: "👥", color: "var(--color-forest)" },
            { label: "Saved trips",      value: inr(stats.trips),          emoji: "🗺",  color: "#0369a1" },
            { label: "Total reviews",    value: inr(stats.reviews),        emoji: "⭐", color: "#d97706" },
            { label: "Pending reviews",  value: inr(stats.pendingReviews), emoji: "🕐", color: stats.pendingReviews > 0 ? "#d97706" : "inherit" },
            { label: "Open SOS",         value: inr(stats.openSOS),        emoji: "🚨", color: stats.openSOS > 0 ? "#c0152e" : "inherit" },
            { label: "KYC pending",      value: inr(stats.kycPending),     emoji: "🪪", color: stats.kycPending > 0 ? "#d97706" : "inherit" },
            { label: "Open reports",     value: inr(stats.openReports),    emoji: "🚩", color: stats.openReports > 0 ? "#c0152e" : "inherit" },
            { label: "Active banners",   value: inr(banners.filter(b=>b.active).length), emoji: "📢", color: "var(--color-forest)" },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-xs opacity-55 font-medium">{s.emoji} {s.label}</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ════ BANNERS ════ */}
      {tab === "banners" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold opacity-70">
              {banners.filter(b=>b.active).length} active · {banners.length} total
            </p>
            <button onClick={() => { setEditingBannerId(null); setShowBannerForm(true); }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--color-saffron)" }}>
              + New banner / ad
            </button>
          </div>

          {/* Banner form */}
          {showBannerForm && (
            <div className="card p-5 space-y-4 border-2" style={{ borderColor: "var(--color-saffron)" }}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{editingBannerId ? "✏️ Edit banner" : "➕ New banner"}</h2>
                <button onClick={() => { setShowBannerForm(false); setEditingBannerId(null); }}
                  className="opacity-50 hover:opacity-100 text-lg">✕</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="form-label">
                  Title *
                  <input className="field" value={bannerForm.title ?? ""} maxLength={120}
                    onChange={(e) => setBannerForm((p) => ({ ...p, title: e.target.value }))} />
                </label>
                <label className="form-label">
                  Subtitle
                  <input className="field" value={bannerForm.subtitle ?? ""} maxLength={200}
                    onChange={(e) => setBannerForm((p) => ({ ...p, subtitle: e.target.value }))} />
                </label>
                <label className="form-label">
                  Button label (CTA)
                  <input className="field" placeholder="e.g. Book now" value={bannerForm.cta_label ?? ""}
                    onChange={(e) => setBannerForm((p) => ({ ...p, cta_label: e.target.value }))} />
                </label>
                <label className="form-label">
                  Click URL
                  <input className="field" type="url" placeholder="https://…" value={bannerForm.url ?? ""}
                    onChange={(e) => setBannerForm((p) => ({ ...p, url: e.target.value }))} />
                </label>
                <label className="form-label">
                  Image URL (optional)
                  <input className="field" type="url" placeholder="https://…" value={bannerForm.image_url ?? ""}
                    onChange={(e) => setBannerForm((p) => ({ ...p, image_url: e.target.value }))} />
                </label>
                <label className="form-label">
                  Type
                  <select className="field" value={bannerForm.type ?? "banner"}
                    onChange={(e) => setBannerForm((p) => ({ ...p, type: e.target.value as Banner["type"] }))}>
                    <option value="banner">🏷 Banner</option>
                    <option value="ad">📣 Ad</option>
                    <option value="announcement">📢 Announcement</option>
                  </select>
                </label>
                <label className="form-label">
                  Position on site
                  <select className="field" value={bannerForm.position ?? "top"}
                    onChange={(e) => setBannerForm((p) => ({ ...p, position: e.target.value as Banner["position"] }))}>
                    <option value="top">⬆ Top of page</option>
                    <option value="inline">↕ Between form and results</option>
                    <option value="bottom">⬇ Bottom of page</option>
                  </select>
                </label>
                <label className="form-label">
                  Priority (higher = first)
                  <input className="field" type="number" value={bannerForm.priority ?? 0}
                    onChange={(e) => setBannerForm((p) => ({ ...p, priority: Number(e.target.value) }))} />
                </label>
                <label className="form-label">
                  Background colour
                  <div className="flex gap-2 items-center">
                    <input type="color" value={bannerForm.bg_color ?? "#1a6b47"} className="h-9 w-14 rounded cursor-pointer border-0"
                      onChange={(e) => setBannerForm((p) => ({ ...p, bg_color: e.target.value }))} />
                    <input className="field flex-1" value={bannerForm.bg_color ?? "#1a6b47"}
                      onChange={(e) => setBannerForm((p) => ({ ...p, bg_color: e.target.value }))} />
                  </div>
                </label>
                <label className="form-label">
                  Text colour
                  <div className="flex gap-2 items-center">
                    <input type="color" value={bannerForm.text_color ?? "#ffffff"} className="h-9 w-14 rounded cursor-pointer border-0"
                      onChange={(e) => setBannerForm((p) => ({ ...p, text_color: e.target.value }))} />
                    <input className="field flex-1" value={bannerForm.text_color ?? "#ffffff"}
                      onChange={(e) => setBannerForm((p) => ({ ...p, text_color: e.target.value }))} />
                  </div>
                </label>
                <label className="form-label">
                  Start date (optional)
                  <input className="field" type="datetime-local" value={bannerForm.starts_at?.slice(0,16) ?? ""}
                    onChange={(e) => setBannerForm((p) => ({ ...p, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                </label>
                <label className="form-label">
                  End date (optional)
                  <input className="field" type="datetime-local" value={bannerForm.ends_at?.slice(0,16) ?? ""}
                    onChange={(e) => setBannerForm((p) => ({ ...p, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} />
                </label>
              </div>

              {/* Live preview */}
              <div>
                <p className="text-xs font-semibold opacity-50 mb-1.5">Preview</p>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: bannerForm.bg_color ?? "#1a6b47", color: bannerForm.text_color ?? "#fff" }}>
                  {bannerForm.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bannerForm.image_url} alt="" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className="font-semibold">{bannerForm.title || "Banner title"}</span>
                    {bannerForm.subtitle && <span className="ml-2 opacity-80 text-xs">{bannerForm.subtitle}</span>}
                  </div>
                  {bannerForm.cta_label && (
                    <span className="rounded-lg px-3 py-1 text-xs font-bold"
                      style={{ background: "rgba(0,0,0,0.2)" }}>
                      {bannerForm.cta_label} →
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <button onClick={saveBanner} disabled={!bannerForm.title || busy === "banner_save"}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "var(--color-forest)" }}>
                  {busy === "banner_save" ? "Saving…" : editingBannerId ? "Save changes" : "Create banner"}
                </button>
                <button onClick={() => { setShowBannerForm(false); setEditingBannerId(null); }}
                  className="rounded-xl px-4 py-2.5 text-sm opacity-60">Cancel</button>
              </div>
            </div>
          )}

          {/* Banner list */}
          {banners.length === 0 && !showBannerForm && (
            <div className="card p-10 text-center opacity-60">No banners yet. Create one above.</div>
          )}
          <div className="space-y-2">
            {banners.map((b) => (
              <div key={b.id} className="card p-3 flex items-center gap-3 flex-wrap"
                style={{ opacity: b.active ? 1 : 0.55 }}>
                {/* Colour swatch */}
                <div className="h-9 w-9 rounded-lg flex-shrink-0 border"
                  style={{ background: b.bg_color, borderColor: "var(--color-temple-2)" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{b.title}</p>
                  <p className="text-xs opacity-50">
                    {b.type} · {b.position} · priority {b.priority}
                    {b.url && <> · <a href={b.url} target="_blank" rel="noopener noreferrer"
                      className="underline">link ↗</a></>}
                  </p>
                </div>
                <span className="text-xs rounded-full px-2 py-0.5 font-semibold"
                  style={{ background: b.active ? "rgba(26,107,71,0.1)" : "rgba(107,114,128,0.1)",
                           color: b.active ? "var(--color-forest)" : "#6b7280" }}>
                  {b.active ? "● Live" : "○ Off"}
                </span>
                <div className="flex gap-1.5">
                  <button onClick={() => toggleBanner(b)} disabled={busy === `tog${b.id}`}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border"
                    style={{ borderColor: "var(--color-temple-2)" }}>
                    {b.active ? "Pause" : "Go live"}
                  </button>
                  <button onClick={() => startEdit(b)}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border"
                    style={{ borderColor: "var(--color-temple-2)", color: "#0369a1" }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => deleteBanner(b.id)} disabled={busy === `del${b.id}`}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border"
                    style={{ borderColor: "var(--color-silk)", color: "var(--color-silk)" }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ KYC DOCUMENTS ════ */}
      {tab === "kyc" && (
        <div className="space-y-3">
          <p className="text-sm opacity-60">{kycs.length} document{kycs.length !== 1 ? "s" : ""} pending review</p>
          {kycs.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-semibold">No pending KYC documents</p>
            </div>
          )}
          {kycs.map((k) => (
            <div key={k.id} className="card p-4 space-y-3 border-l-4"
              style={{ borderColor: "var(--color-saffron)" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-bold">{k.display_name}</p>
                  <p className="text-xs opacity-50 capitalize">
                    📄 {k.doc_type} · Uploaded {new Date(k.uploaded_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                  style={{ background: "rgba(217,119,6,0.1)", color: "#92400e" }}>
                  ⏳ Pending
                </span>
              </div>

              {/* Document image */}
              {k.signed_url ? (
                <div className="rounded-xl overflow-hidden border max-w-sm"
                  style={{ borderColor: "var(--color-temple-2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={k.signed_url} alt={`${k.doc_type} document`}
                    className="w-full object-contain max-h-64 bg-gray-50" />
                  <div className="flex gap-2 p-2">
                    <a href={k.signed_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs underline opacity-60">Open full size ↗</a>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border p-4 text-center text-xs opacity-50"
                  style={{ borderColor: "var(--color-temple-2)" }}>
                  Document preview not available (bucket may need setup)
                </div>
              )}

              <div className="flex gap-2">
                <button disabled={busy === `kyc${k.id}`} onClick={() => kycAction(k, "verified")}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "var(--color-forest)" }}>
                  {busy === `kyc${k.id}` ? "…" : "✓ Approve — verify user"}
                </button>
                <button disabled={busy === `kyc${k.id}`} onClick={() => kycAction(k, "rejected")}
                  className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-silk-2)", color: "var(--color-silk)", border: "1px solid var(--color-silk)" }}>
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════ REVIEW MODERATION ════ */}
      {tab === "reviews" && (
        <div className="space-y-3">
          {/* Type switcher */}
          <div className="flex gap-2">
            {(["hotel", "food"] as const).map((t) => (
              <button key={t} onClick={() => setReviewType(t)}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-all"
                style={reviewType === t
                  ? { background: "var(--color-saffron)", color: "#fff" }
                  : { background: "var(--color-saffron-3)", color: "#92400e" }}>
                {t === "hotel" ? "🏨 Stay reviews" : "🍽 Food reviews"}
              </button>
            ))}
          </div>

          <p className="text-xs opacity-60">
            {reviews.length} pending review{reviews.length !== 1 ? "s" : ""} — approve to publish, reject to delete
          </p>

          {reviews.length === 0 && (
            <div className="card p-10 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-semibold">No pending {reviewType} reviews</p>
            </div>
          )}

          {reviews.map((rv) => (
            <div key={rv.id} className="card p-4 space-y-2 border-l-4"
              style={{ borderColor: "var(--color-saffron)" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-bold">{rv.display_name}</p>
                  <p className="text-xs opacity-50">
                    {reviewType === "food" && rv.dish_name && `🍽 ${rv.dish_name} · `}
                    {reviewType === "hotel" ? `Place: ${rv.entity_id}` : `Restaurant: ${rv.restaurant_id}`}
                    {" · "}{new Date(rv.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                {/* Stars */}
                <span className="text-base">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} style={{ color: i < rv.rating ? "#d97706" : "#d1d5db" }}>★</span>
                  ))}
                </span>
              </div>

              <p className="text-sm font-semibold">{rv.title}</p>
              {rv.body && <p className="text-sm opacity-75 leading-relaxed">{rv.body}</p>}

              {/* Price info */}
              {(rv.price_paid || rv.bargain_price) && (
                <p className="text-xs opacity-60">
                  {rv.price_paid && `💰 Paid ₹${rv.price_paid.toLocaleString("en-IN")}`}
                  {rv.bargain_price && ` · 🤝 Bargain ₹${rv.bargain_price.toLocaleString("en-IN")}`}
                </p>
              )}

              {/* Review photos */}
              {rv.image_urls && rv.image_urls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rv.image_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border"
                      style={{ width: 64, height: 64, borderColor: "var(--color-temple-2)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Review photo ${i+1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button disabled={busy === `rev${rv.id}`} onClick={() => reviewAction(rv.id, reviewType, true)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "var(--color-forest)" }}>
                  {busy === `rev${rv.id}` ? "…" : "✓ Approve & publish"}
                </button>
                <button disabled={busy === `rev${rv.id}`} onClick={() => reviewAction(rv.id, reviewType, false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-silk-2)", color: "var(--color-silk)", border: "1px solid var(--color-silk)" }}>
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════ USERS ════ */}
      {tab === "users" && (
        <div className="space-y-3">
          <input className="field max-w-sm" placeholder="Search by name or username…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-xs opacity-50">{filteredUsers.length} users</p>
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <div key={u.user_id} className="card p-3 flex items-center gap-3 flex-wrap">
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: "var(--color-saffron)" }}>
                  {(u.display_name ?? "?")[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.display_name}</p>
                  <p className="text-xs opacity-50">@{u.username}</p>
                </div>
                <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                  style={{
                    background: u.kyc_status === "verified" ? "rgba(26,107,71,0.1)" : "rgba(217,119,6,0.1)",
                    color: u.kyc_status === "verified" ? "var(--color-forest)" : "#92400e",
                  }}>🪪 {u.kyc_status}</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button disabled={busy === u.user_id+"unblock_otp"} onClick={() => userAction(u.user_id, "unblock_otp")}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border disabled:opacity-50"
                    style={{ borderColor: "var(--color-temple-2)", color: "#0369a1" }}>🔓 Unblock OTP</button>
                  <button disabled={busy === u.user_id+"ban"}
                    onClick={() => { if (confirm(`Ban ${u.display_name}?`)) userAction(u.user_id, "ban"); }}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border disabled:opacity-50"
                    style={{ borderColor: "var(--color-silk)", color: "var(--color-silk)" }}>🚫 Ban</button>
                  <button disabled={busy === u.user_id+"unban"} onClick={() => userAction(u.user_id, "unban")}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold border disabled:opacity-50"
                    style={{ borderColor: "var(--color-forest)", color: "var(--color-forest)" }}>✓ Unban</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ SOS ════ */}
      {tab === "sos" && (
        <div className="space-y-3">
          {sos.length === 0 && <div className="card p-8 text-center"><p className="text-3xl mb-2">✅</p><p className="font-semibold">No SOS events</p></div>}
          {sos.map((e) => (
            <div key={e.id} className="card p-4 space-y-2 border-l-4"
              style={{ borderColor: e.status === "open" ? "#c0152e" : "#d1d5db" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-bold">{e.display_name}</p>
                  <p className="text-xs opacity-50">{new Date(e.created_at).toLocaleString("en-IN")}</p>
                </div>
                <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                  style={{ background: e.status === "open" ? "rgba(192,21,46,0.1)" : "rgba(209,213,219,0.5)",
                           color: e.status === "open" ? "#c0152e" : "#6b7280" }}>
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
                  onClick={async () => {
                    setBusy(`sos${e.id}`);
                    await fetch("/api/admin/sos", { method:"PATCH", headers:{...H,"content-type":"application/json"},
                      body: JSON.stringify({ id: e.id, status: "resolved" }) });
                    setBusy(null); showToast("SOS resolved"); load();
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ background: "var(--color-forest)" }}>
                  {busy === `sos${e.id}` ? "…" : "✓ Mark resolved"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ════ REPORTS ════ */}
      {tab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 && <div className="card p-8 text-center"><p className="text-3xl mb-2">✅</p><p className="font-semibold">No reports</p></div>}
          {reports.map((r) => (
            <div key={r.id} className="card p-4 flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-semibold">Message #{r.message_id}</p>
                <p className="text-xs opacity-60">Reason: {r.reason}</p>
                <p className="text-xs opacity-40">{new Date(r.created_at).toLocaleString("en-IN")}</p>
              </div>
              {r.auto_actioned
                ? <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                    style={{ background: "rgba(26,107,71,0.1)", color: "var(--color-forest)" }}>✓ Actioned</span>
                : <button disabled={busy === `rep${r.id}`}
                    onClick={async () => {
                      setBusy(`rep${r.id}`);
                      await fetch("/api/admin/reports", { method:"PATCH", headers:{...H,"content-type":"application/json"},
                        body: JSON.stringify({ id: r.id, auto_actioned: true }) });
                      setBusy(null); load();
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ background: "var(--color-saffron)" }}>Mark reviewed</button>
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
