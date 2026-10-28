"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

type Tab = "signin" | "signup" | "forgot";

// ── Eye icon (show/hide password) ────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
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

// ── Setup guide (shown when Supabase is not configured) ───────────────────────
function SetupGuide() {
  return (
    <div className="mx-auto mt-12 max-w-lg space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-5xl">🔧</div>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>
          Connect Supabase to enable auth
        </h1>
        <p className="text-sm opacity-65 max-w-xs mx-auto leading-relaxed">
          Auth, saved trips, and shareable links require a free Supabase project. Takes 3 minutes.
        </p>
      </div>

      {/* Steps */}
      <div className="card p-5 space-y-4">
        {[
          {
            n: "1",
            title: "Create a free project",
            body: <>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
              className="underline font-medium" style={{ color: "var(--color-forest)" }}>
              supabase.com/dashboard
            </a> → New project → choose a region close to India (Mumbai/Singapore).</>,
          },
          {
            n: "2",
            title: "Run the schema",
            body: <>In SQL Editor paste and run the contents of{" "}
              <code className="text-xs bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">supabase/schema.sql</code>{" "}
              from this repo.</>,
          },
          {
            n: "3",
            title: "Copy your API keys",
            body: <>Settings → API → copy <strong>Project URL</strong> and <strong>anon public</strong> key.</>,
          },
          {
            n: "4",
            title: "Add to .env.local",
            body: null,
          },
          {
            n: "5",
            title: "Enable auth providers",
            body: <>Authentication → Providers → enable <strong>Email</strong> and (optionally) <strong>Google</strong>.
              For Google you need a GCP OAuth client ID.</>,
          },
          {
            n: "6",
            title: "Add redirect URL",
            body: <>Authentication → URL Configuration → add{" "}
              <code className="text-xs bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">
                http://localhost:3000/auth/callback
              </code>{" "}and your production URL to Redirect URLs.</>,
          },
        ].map((step) => (
          <div key={step.n} className="flex gap-3">
            <div className="flex-shrink-0 h-6 w-6 rounded-full text-white text-xs font-bold grid place-items-center mt-0.5"
              style={{ background: "var(--color-forest)" }}>
              {step.n}
            </div>
            <div className="text-sm leading-relaxed">
              <p className="font-semibold mb-0.5">{step.title}</p>
              {step.body && <p className="opacity-75">{step.body}</p>}
              {!step.body && (
                <div className="mt-1 rounded-lg p-3 font-mono text-xs space-y-1"
                  style={{ background: "var(--color-forest)", color: "#c6f6d5" }}>
                  <p>NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co</p>
                  <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-xs opacity-50 space-y-1">
        <p>Restart the dev server after editing .env.local for changes to take effect.</p>
        <Link href="/" className="underline">← Back to planner (works without auth)</Link>
      </div>
    </div>
  );
}

// ── Main auth UI ──────────────────────────────────────────────────────────────
export default function AuthContent() {
  const { user, loading, configured, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const router     = useRouter();
  const params     = useSearchParams();

  const [tab, setTab]           = useState<Tab>("signin");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState<{ text: string; type: "error" | "success" | "info" } | null>(null);

  const oauthError = params.get("error");

  // Redirect if already signed in
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  // Show not-configured guide
  if (!configured) return <SetupGuide />;

  // Loading spinner
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4"
          style={{ borderColor: "var(--color-forest)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  function switchTab(t: Tab) {
    setTab(t);
    setMsg(null);
    setName(""); setEmail(""); setPassword("");
  }

  async function handleGoogle() {
    setBusy(true);
    await signInWithGoogle();
    // page will redirect — no setBusy(false) needed
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    if (tab === "forgot") {
      const { error } = await resetPassword(email);
      setBusy(false);
      if (error) {
        setMsg({ text: friendlyError(error.message), type: "error" });
      } else {
        setMsg({ text: "Password reset email sent! Check your inbox (and spam folder).", type: "success" });
      }
      return;
    }

    if (tab === "signup") {
      if (name.trim().length < 2) {
        setMsg({ text: "Please enter your full name (at least 2 characters).", type: "error" });
        setBusy(false);
        return;
      }
      if (password.length < 8) {
        setMsg({ text: "Password must be at least 8 characters.", type: "error" });
        setBusy(false);
        return;
      }
      const { error } = await signUpWithEmail(email, password, name.trim());
      setBusy(false);
      if (error) {
        setMsg({ text: friendlyError(error.message), type: "error" });
      } else {
        setMsg({
          text: "Account created! Check your email for a confirmation link before signing in.",
          type: "success",
        });
      }
      return;
    }

    // Sign in
    const { error } = await signInWithEmail(email, password);
    setBusy(false);
    if (error) {
      setMsg({ text: friendlyError(error.message), type: "error" });
    }
    // on success, onAuthStateChange fires → useEffect redirects to "/"
  }

  return (
    <div className="mx-auto mt-10 max-w-sm pb-16">

      {/* Branding */}
      <div className="text-center mb-7">
        <Link href="/" className="text-4xl block mb-3">🌿</Link>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-forest)" }}>
          {tab === "signin" ? "Welcome back"
           : tab === "signup" ? "Create your account"
           : "Reset your password"}
        </h1>
        <p className="text-sm opacity-60 mt-1">
          {tab === "signin" ? "Sign in to save and share your Karnataka trips"
           : tab === "signup" ? "Save trips, share plans, and more"
           : "We'll email you a reset link"}
        </p>
      </div>

      <div className="card p-6 space-y-5">

        {/* ── Google OAuth ── */}
        {tab !== "forgot" && (
          <button onClick={handleGoogle} disabled={busy}
            className="w-full flex items-center justify-center gap-3 rounded-xl border-2 py-3 font-semibold text-sm transition-all disabled:opacity-50"
            style={{ borderColor: "var(--color-temple-2)" }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        )}

        {/* ── Divider ── */}
        {tab !== "forgot" && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--color-temple-2)" }} />
            <span className="text-xs opacity-40 font-medium">or</span>
            <div className="flex-1 h-px" style={{ background: "var(--color-temple-2)" }} />
          </div>
        )}

        {/* ── Tab switcher ── */}
        {tab !== "forgot" && (
          <div className="flex rounded-xl overflow-hidden border"
            style={{ borderColor: "var(--color-temple-2)" }}>
            {(["signin", "signup"] as const).map((t) => (
              <button key={t} type="button"
                onClick={() => switchTab(t)}
                className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                style={tab === t
                  ? { background: "var(--color-forest)", color: "#fff" }
                  : { color: "inherit", opacity: 0.55 }}>
                {t === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>

          {/* Name — signup only */}
          {tab === "signup" && (
            <label className="form-label">
              Full name
              <input type="text" required minLength={2} className="field"
                placeholder="Arun Kumar" autoComplete="name"
                value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}

          {/* Email */}
          <label className="form-label">
            Email address
            <input type="email" required className="field"
              placeholder="you@example.com" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          {/* Password — not shown on forgot */}
          {tab !== "forgot" && (
            <label className="form-label">
              Password
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={tab === "signup" ? 8 : 1}
                  className="field pr-10"
                  placeholder={tab === "signup" ? "min. 8 characters" : "••••••••"}
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity"
                  aria-label={showPw ? "Hide password" : "Show password"}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </label>
          )}

          {/* Forgot password link */}
          {tab === "signin" && (
            <div className="text-right">
              <button type="button" onClick={() => switchTab("forgot")}
                className="text-xs underline opacity-55 hover:opacity-100 transition-opacity">
                Forgot password?
              </button>
            </div>
          )}

          {/* Messages */}
          {msg && (
            <div className={`text-sm rounded-xl px-3 py-2.5 ${
              msg.type === "error"   ? "alert-error"
            : msg.type === "success" ? "alert-info"
            : "alert-info"}`}>
              {msg.text}
            </div>
          )}
          {oauthError && !msg && (
            <div className="alert-error text-sm rounded-xl px-3 py-2.5">
              Google sign-in failed. Please try email/password or try again.
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={busy} className="submit-btn">
            {busy
              ? <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Please wait…
                </span>
              : tab === "signin"  ? "Sign in"
              : tab === "signup"  ? "Create account"
              : "Send reset email"}
          </button>
        </form>

        {/* Back from forgot */}
        {tab === "forgot" && (
          <button type="button" onClick={() => switchTab("signin")}
            className="w-full text-sm opacity-60 hover:opacity-100 transition-opacity text-center">
            ← Back to sign in
          </button>
        )}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs opacity-45 mt-5 leading-relaxed px-2">
        By continuing you agree to our terms of use.
        Prices shown in this app are estimates only.
      </p>
    </div>
  );
}

/** Map Supabase error strings to user-friendly messages */
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials"))
    return "Incorrect email or password. Please check and try again.";
  if (m.includes("email not confirmed"))
    return "Please confirm your email address first. Check your inbox.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (m.includes("password should be at least"))
    return "Password must be at least 8 characters.";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("network") || m.includes("fetch"))
    return "Network error. Check your internet connection and try again.";
  if (m.includes("signup is disabled"))
    return "Sign-ups are currently disabled. Contact the administrator.";
  return msg; // fall back to raw message
}
