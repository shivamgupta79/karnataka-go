"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import VerificationBadge, { BadgeStatus } from "@/components/VerificationBadge";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import QRScanner from "@/components/QRScanner";
import type { QRPayload } from "@/lib/qr";

// ── Types ───────────────────────────────────────────────────────────────────

interface PrivacySettings {
  shareEmail: boolean;
  sharePhone: boolean;
  showQR: boolean;
}

interface ProfileData {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  locale: string | null;
  privacy_settings: PrivacySettings | null;
  email: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  phone_confirmed_at: string | null;
}

interface KycRow {
  id: number;
  doc_type: "aadhaar" | "pan" | "passport";
  status: "pending" | "verified" | "rejected";
  uploaded_at: string;
  reviewed_at: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function kycStatusToBadge(status: KycRow["status"] | undefined): BadgeStatus {
  if (!status) return "not_added";
  if (status === "verified") return "verified";
  if (status === "pending") return "pending";
  return "unverified";
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, loading, configured } = useAuth();

  // Profile data
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [fetching, setFetching] = useState(true);

  // KYC records
  const [kycRows, setKycRows] = useState<KycRow[]>([]);

  // Edit basic info
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Phone verification
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Privacy settings
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    shareEmail: false,
    sharePhone: false,
    showQR: true,
  });
  const [privacySaving, setPrivacySaving] = useState(false);

  // KYC upload
  const [kycUploading, setKycUploading] = useState<string | null>(null);
  const [kycError, setKycError] = useState<string | null>(null);
  const kycInputRef = useRef<HTMLInputElement>(null);
  const [kycUploadType, setKycUploadType] = useState<KycRow["doc_type"] | null>(null);

  // QR scanner modal
  const [showScanner, setShowScanner] = useState(false);

  // QR timestamp — set once on mount and renewed only by an explicit "refresh"
  // action, so the QR payload (and thus the rendered image) stays stable across
  // unrelated re-renders (toggling privacy, typing, toasts) instead of churning.
  const [qrTs, setQrTs] = useState<number | null>(null);
  useEffect(() => {
    setQrTs((prev) => prev ?? Date.now());
  }, []);
  function refreshQR() {
    setQrTs(Date.now());
  }

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading || !user || !configured) {
      setFetching(false);
      return;
    }

    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/profile/kyc").then((r) => r.json()),
    ])
      .then(([profileRes, kycRes]) => {
        if (profileRes.profile) {
          const p = profileRes.profile as ProfileData;
          setProfile(p);
          setDisplayName(p.display_name ?? "");
          setUsername(p.username ?? "");
          setBio(p.bio ?? "");
          if (p.privacy_settings) setPrivacy(p.privacy_settings);
        }
        if (kycRes.verifications) {
          setKycRows(kycRes.verifications as KycRow[]);
        }
      })
      .catch(() => showToast("Failed to load profile"))
      .finally(() => setFetching(false));
  }, [user, loading, configured]);

  // ── Toast helper ──────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // ── Avatar upload ─────────────────────────────────────────────────────────

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Photo must be 2 MB or smaller");
      return;
    }
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const data = await res.json() as { avatar_url?: string; error?: string };
      if (!res.ok || !data.avatar_url) {
        showToast(data.error ?? "Upload failed");
        return;
      }
      setProfile((prev) => prev ? { ...prev, avatar_url: data.avatar_url! } : prev);
      showToast("Photo updated ✓");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  // ── Save basic info ───────────────────────────────────────────────────────

  async function handleSaveInfo() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, username, bio }),
      });
      const data = await res.json() as { profile?: ProfileData; error?: string };
      if (!res.ok) {
        setSaveError(data.error ?? "Save failed");
        return;
      }
      if (data.profile) {
        setProfile((prev) => prev ? { ...prev, ...data.profile } : data.profile!);
      }
      setEditMode(false);
      showToast("Profile updated ✓");
    } finally {
      setSaving(false);
    }
  }

  // ── Phone verification ────────────────────────────────────────────────────

  async function handleSendOtp() {
    setPhoneSending(true);
    setPhoneError(null);
    try {
      const res = await fetch("/api/profile/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: phoneInput }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setPhoneError(data.error ?? "Failed to send OTP");
        return;
      }
      setPhoneOtpSent(true);
      showToast("OTP sent to your phone");
    } finally {
      setPhoneSending(false);
    }
  }

  async function handleVerifyOtp() {
    setPhoneVerifying(true);
    setPhoneError(null);
    try {
      const res = await fetch("/api/profile/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: phoneInput, token: phoneOtp }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setPhoneError(data.error ?? "Verification failed");
        return;
      }
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              phone: phoneInput,
              phone_confirmed_at: new Date().toISOString(),
            }
          : prev
      );
      setPhoneOtpSent(false);
      setPhoneInput("");
      setPhoneOtp("");
      showToast("Phone verified ✓");
    } finally {
      setPhoneVerifying(false);
    }
  }

  // ── Privacy settings ──────────────────────────────────────────────────────

  async function handlePrivacySave(newPrivacy: PrivacySettings) {
    setPrivacy(newPrivacy);
    setPrivacySaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacy_settings: newPrivacy }),
      });
      if (!res.ok) showToast("Failed to save privacy settings");
      else showToast("Privacy settings saved ✓");
    } finally {
      setPrivacySaving(false);
    }
  }

  // ── KYC upload ────────────────────────────────────────────────────────────

  function triggerKycUpload(docType: KycRow["doc_type"]) {
    setKycUploadType(docType);
    setKycError(null);
    kycInputRef.current?.click();
  }

  async function handleKycFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !kycUploadType) return;
    if (file.size > 5 * 1024 * 1024) {
      setKycError("File must be 5 MB or smaller");
      return;
    }
    setKycUploading(kycUploadType);
    setKycError(null);
    try {
      const fd = new FormData();
      fd.append("doc_type", kycUploadType);
      fd.append("document", file);
      const res = await fetch("/api/profile/kyc", { method: "POST", body: fd });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setKycError(data.error ?? "Upload failed");
        return;
      }
      // Refresh KYC rows
      const kycRes = await fetch("/api/profile/kyc").then((r) => r.json()) as { verifications?: KycRow[] };
      if (kycRes.verifications) setKycRows(kycRes.verifications);
      showToast("Document submitted for review ✓");
    } finally {
      setKycUploading(null);
      setKycUploadType(null);
      if (kycInputRef.current) kycInputRef.current.value = "";
    }
  }

  // ── Resend email ──────────────────────────────────────────────────────────

  async function handleResendEmail() {
    const res = await fetch("/api/profile/resend-email", { method: "POST" });
    if (res.ok) showToast("Verification email sent ✓");
    else showToast("Failed to resend email");
  }

  // ── QR payload ────────────────────────────────────────────────────────────
  // The payload carries only {uid, ts}: no name/email/phone. The lookup route
  // resolves contact details from the target user's privacy settings, so
  // nothing the user did not opt to share is ever embedded in the QR image.
  const qrPayload: QRPayload | null = useMemo(
    () => (user && qrTs !== null ? { uid: user.id, ts: qrTs } : null),
    [user, qrTs]
  );

  // ── Render gates ──────────────────────────────────────────────────────────

  if (loading || fetching) {
    return (
      <div className="flex justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4"
          style={{
            borderColor: "var(--color-forest)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center max-w-sm mx-auto">
        <p className="text-4xl">🔧</p>
        <h1 className="text-xl font-bold">Auth not configured</h1>
        <p className="text-sm opacity-60 leading-relaxed">
          Add Supabase credentials to{" "}
          <code className="font-mono bg-black/10 px-1 rounded">.env.local</code>{" "}
          to enable profiles.
        </p>
        <Link
          href="/"
          className="text-sm underline opacity-50"
        >
          ← Back to planner
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="text-xl font-bold">Sign in to view your profile</h1>
        <p className="text-sm opacity-60">
          Create a free account to manage your profile and verify your identity.
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

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">
      <h1
        className="text-2xl font-extrabold"
        style={{ color: "var(--color-forest)" }}
      >
        My Profile
      </h1>

      {/* Toast */}
      {toast && (
        <div className="alert-info text-sm font-medium">{toast}</div>
      )}

      {/* ── A: Avatar ──────────────────────────────────────────────────────── */}
      <div className="card p-5 flex items-center gap-5">
        {/* Avatar circle */}
        <div className="relative flex-shrink-0">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt="Profile photo"
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover border-2"
              style={{ borderColor: "var(--color-temple-2)" }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: "var(--color-saffron)" }}
            >
              {getInitials(profile?.display_name ?? user.email)}
            </div>
          )}
          {avatarUploading && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.4)" }}>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-bold text-lg">
            {profile?.display_name ?? "Your name"}
          </p>
          {profile?.username && (
            <p className="text-sm opacity-60">@{profile.username}</p>
          )}
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors hover:opacity-80 disabled:opacity-50"
            style={{
              borderColor: "var(--color-forest)",
              color: "var(--color-forest)",
            }}
          >
            {avatarUploading ? "Uploading…" : "Change photo"}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
            aria-label="Upload profile photo"
          />
        </div>
      </div>

      {/* ── B: Basic info ────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-label mb-0">Basic Info</h2>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="text-xs font-semibold px-3 py-1 rounded-lg"
              style={{ color: "var(--color-forest)" }}
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-3">
            <label className="form-label">
              Display name
              <input
                className="field"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={80}
              />
            </label>
            <label className="form-label">
              Username
              <input
                className="field"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="letters, numbers, underscores (3–20)"
                pattern="^[a-z0-9_]{3,20}$"
                maxLength={20}
              />
              <span className="text-xs opacity-50">
                Lowercase letters, numbers, underscores only
              </span>
            </label>
            <label className="form-label">
              Bio
              <textarea
                className="field"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A few words about you"
                maxLength={300}
                rows={3}
              />
            </label>
            {saveError && (
              <div className="alert-error text-sm">{saveError}</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveInfo}
                disabled={saving || !displayName.trim()}
                className="submit-btn text-sm py-2"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setSaveError(null);
                  setDisplayName(profile?.display_name ?? "");
                  setUsername(profile?.username ?? "");
                  setBio(profile?.bio ?? "");
                }}
                className="flex-1 rounded-xl border py-2 text-sm font-semibold transition-colors"
                style={{ borderColor: "var(--color-temple-2)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="opacity-50">Name:</span>{" "}
              <span className="font-medium">
                {profile?.display_name ?? "—"}
              </span>
            </p>
            <p>
              <span className="opacity-50">Username:</span>{" "}
              <span className="font-medium">
                {profile?.username ? `@${profile.username}` : "—"}
              </span>
            </p>
            {profile?.bio && (
              <p>
                <span className="opacity-50">Bio:</span>{" "}
                <span>{profile.bio}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── C: Email ──────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="section-label mb-0">Email</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-medium">{profile?.email ?? "—"}</p>
          <VerificationBadge
            status={profile?.email_confirmed_at ? "verified" : "unverified"}
          />
        </div>
        {!profile?.email_confirmed_at && (
          <button
            onClick={handleResendEmail}
            className="rounded-lg px-4 py-1.5 text-xs font-semibold border transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--color-saffron)",
              color: "var(--color-saffron)",
            }}
          >
            📧 Resend verification email
          </button>
        )}
      </div>

      {/* ── D: Phone ──────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-3">
        <h2 className="section-label mb-0">Phone Number</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm font-medium">
            {profile?.phone ?? "Not added"}
          </p>
          <VerificationBadge
            status={
              profile?.phone_confirmed_at
                ? "verified"
                : profile?.phone
                ? "unverified"
                : "not_added"
            }
          />
        </div>

        {!profile?.phone_confirmed_at && (
          <div className="space-y-2">
            <label className="form-label">
              Mobile number (India)
              <input
                className="field"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                type="tel"
                maxLength={13}
              />
            </label>

            {!phoneOtpSent ? (
              <button
                onClick={handleSendOtp}
                disabled={phoneSending || !/^\+91[6-9]\d{9}$/.test(phoneInput)}
                className="submit-btn text-sm py-2"
              >
                {phoneSending ? "Sending…" : "Send OTP"}
              </button>
            ) : (
              <div className="space-y-2">
                <label className="form-label">
                  Enter OTP
                  <input
                    className="field"
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={8}
                    inputMode="numeric"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyOtp}
                    disabled={phoneVerifying || phoneOtp.length < 4}
                    className="submit-btn text-sm py-2"
                  >
                    {phoneVerifying ? "Verifying…" : "Verify OTP"}
                  </button>
                  <button
                    onClick={() => {
                      setPhoneOtpSent(false);
                      setPhoneOtp("");
                    }}
                    className="flex-1 rounded-xl border py-2 text-sm font-semibold"
                    style={{ borderColor: "var(--color-temple-2)" }}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {phoneError && (
              <div className="alert-error text-sm">{phoneError}</div>
            )}
          </div>
        )}
      </div>

      {/* ── E: Document verification ─────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="section-label mb-0">Document Verification</h2>
        <p className="text-xs opacity-60 leading-relaxed">
          Upload a government-issued ID to get a verified badge. Documents are
          stored securely and reviewed by the KarnatakaGo team.
        </p>

        {kycError && <div className="alert-error text-sm">{kycError}</div>}

        {/* Hidden file input shared across all doc types */}
        <input
          ref={kycInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleKycFileChange}
          aria-label="Upload identity document"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(["aadhaar", "pan", "passport"] as const).map((docType) => {
            const existing = kycRows.find((r) => r.doc_type === docType);
            const isUploading = kycUploading === docType;
            const labels = {
              aadhaar: { title: "Aadhaar", emoji: "🪪" },
              pan: { title: "PAN Card", emoji: "💳" },
              passport: { title: "Passport", emoji: "📘" },
            };
            return (
              <div
                key={docType}
                className="rounded-xl border p-3 flex flex-col gap-2"
                style={{ borderColor: "var(--color-temple-2)" }}
              >
                <div className="flex items-center gap-2">
                  <span>{labels[docType].emoji}</span>
                  <p className="font-semibold text-sm">{labels[docType].title}</p>
                </div>
                <VerificationBadge
                  status={kycStatusToBadge(existing?.status)}
                />
                {existing?.uploaded_at && (
                  <p className="text-xs opacity-50">
                    Uploaded{" "}
                    {new Date(existing.uploaded_at).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={() => triggerKycUpload(docType)}
                  disabled={isUploading || existing?.status === "verified"}
                  className="rounded-lg py-1.5 text-xs font-semibold border transition-colors hover:opacity-80 disabled:opacity-40"
                  style={{
                    borderColor: "var(--color-forest)",
                    color: "var(--color-forest)",
                  }}
                >
                  {isUploading
                    ? "Uploading…"
                    : existing
                    ? "Re-upload"
                    : "Upload"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── F: Privacy controls ───────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-label mb-0">Privacy Settings</h2>
          {privacySaving && (
            <span className="text-xs opacity-50">Saving…</span>
          )}
        </div>

        {(
          [
            {
              key: "shareEmail" as const,
              label: "Share email via QR",
              desc: "Show your email when someone scans your QR code",
            },
            {
              key: "sharePhone" as const,
              label: "Share phone via QR",
              desc: "Show your phone number when someone scans your QR code",
            },
            {
              key: "showQR" as const,
              label: "Allow QR scanning",
              desc: "Let others scan your QR code to see your profile",
            },
          ] as const
        ).map(({ key, label, desc }) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs opacity-50 mt-0.5">{desc}</p>
            </div>
            <button
              role="switch"
              aria-checked={privacy[key]}
              onClick={() => {
                const updated = { ...privacy, [key]: !privacy[key] };
                void handlePrivacySave(updated);
              }}
              className="relative flex-shrink-0 w-10 h-6 rounded-full transition-colors"
              style={{
                background: privacy[key]
                  ? "var(--color-forest)"
                  : "var(--color-temple-2)",
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                style={{ left: privacy[key] ? "1.25rem" : "0.125rem" }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* ── G: QR code ────────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="section-label mb-0">My QR Code</h2>
        <p className="text-xs opacity-60">
          Share this QR code so other KarnatakaGo users can find your profile.
          It works only on KarnatakaGo. Tap &quot;Refresh QR&quot; to regenerate it.
        </p>

        {privacy.showQR && qrPayload ? (
          <div className="flex flex-col items-center gap-4">
            <QRCodeDisplay payload={qrPayload} />
            <button
              onClick={refreshQR}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
              style={{
                borderColor: "var(--color-temple-2)",
                color: "var(--color-forest)",
              }}
            >
              ↻ Refresh QR
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors"
              style={{ background: "var(--color-forest)" }}
            >
              📷 Scan another user&apos;s QR
            </button>
          </div>
        ) : (
          <div className="rounded-xl p-4 text-center space-y-2" style={{ background: "var(--color-saffron-3)" }}>
            <p className="text-sm font-medium">QR code is hidden</p>
            <p className="text-xs opacity-60">
              Enable &quot;Allow QR scanning&quot; in Privacy Settings to show your QR
              code.
            </p>
            <button
              onClick={() => setShowScanner(true)}
              className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors"
              style={{ background: "var(--color-forest)" }}
            >
              📷 Scan another user&apos;s QR
            </button>
          </div>
        )}
      </div>

      {/* ── QR Scanner modal ─────────────────────────────────────────────────── */}
      {showScanner && (
        <QRScanner onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
