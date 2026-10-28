"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [busy, setBusy]             = useState(false);
  const [ready, setReady]           = useState(false); // session exchanged
  const [msg, setMsg]               = useState<{ text: string; type: "error" | "success" } | null>(null);

  // Supabase embeds the token in the URL hash; the SDK handles it automatically
  // on the first auth state change event after the page loads.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setMsg({ text: "Password must be at least 8 characters.", type: "error" });
      return;
    }
    if (password !== confirm) {
      setMsg({ text: "Passwords don't match.", type: "error" });
      return;
    }
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    if (!supabase) {
      setMsg({ text: "Auth not configured.", type: "error" });
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMsg({ text: error.message, type: "error" });
    } else {
      setMsg({ text: "Password updated! Redirecting to sign in…", type: "success" });
      setTimeout(() => router.replace("/auth"), 2000);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm pb-16">
      <div className="text-center mb-7">
        <Link href="/" className="text-4xl block mb-3">🌿</Link>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>
          Set new password
        </h1>
        <p className="text-sm opacity-60 mt-1">Choose a strong password for your account</p>
      </div>

      <div className="card p-6">
        {!ready ? (
          <div className="text-center py-6 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 mx-auto"
              style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }} />
            <p className="text-sm opacity-60">Verifying reset link…</p>
            <p className="text-xs opacity-40">
              If nothing happens, the link may have expired.{" "}
              <Link href="/auth" className="underline">Request a new one.</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <label className="form-label">
              New password
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required minLength={8}
                  className="field pr-10"
                  placeholder="min. 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity"
                  aria-label={showPw ? "Hide" : "Show"}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </label>

            <label className="form-label">
              Confirm password
              <input
                type={showPw ? "text" : "password"}
                required minLength={8}
                className="field"
                placeholder="repeat password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>

            {/* Strength hint */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1,2,3,4].map((level) => (
                    <div key={level} className="flex-1 h-1.5 rounded-full"
                      style={{
                        background: passwordStrength(password) >= level
                          ? level <= 1 ? "#dc2626"
                          : level <= 2 ? "#f59e0b"
                          : level <= 3 ? "#65a30d"
                          : "#1a6b47"
                          : "rgba(0,0,0,0.1)"
                      }} />
                  ))}
                </div>
                <p className="text-xs opacity-55">
                  {["", "Weak — add numbers or symbols", "Fair", "Good", "Strong"][passwordStrength(password)]}
                </p>
              </div>
            )}

            {msg && (
              <div className={`text-sm rounded-xl px-3 py-2.5 ${msg.type === "error" ? "alert-error" : "alert-info"}`}>
                {msg.text}
              </div>
            )}

            <button type="submit" disabled={busy} className="submit-btn">
              {busy
                ? <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Updating…
                  </span>
                : "Update password"}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-xs opacity-40 mt-5">
        <Link href="/auth" className="underline">← Back to sign in</Link>
      </p>
    </div>
  );
}

function passwordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  return Math.min(4, score);
}
