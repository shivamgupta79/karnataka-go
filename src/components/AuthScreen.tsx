import { useState, type FormEvent } from "react";
import { Infinity as LoopIcon, MailCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button, TextField, cn } from "./ui";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const isSignup = mode === "signup";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 6) {
      setError("Your password needs to be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    const result = isSignup ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) setConfirmationSent(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-md">
            <LoopIcon className="size-7" aria-hidden="true" />
          </span>
          <h1 className="font-heading text-3xl font-bold text-foreground">HabitLoop</h1>
          <p className="mt-2 text-sm text-muted-foreground">Small daily wins, tracked over time.</p>
        </div>

        {confirmationSent ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <MailCheck className="size-6" aria-hidden="true" />
            </span>
            <h2 className="font-heading text-lg font-semibold text-foreground">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Tap it to finish signing
              in.
            </p>
            <Button
              variant="secondary"
              className="mt-5 w-full"
              onClick={() => setConfirmationSent(false)}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div
              className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
              role="group"
              aria-label="Choose sign in or sign up"
            >
              {(["signin", "signup"] as Mode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchMode(value)}
                  aria-pressed={mode === value}
                  className={cn(
                    "press cursor-pointer rounded-lg py-2 text-sm font-semibold",
                    mode === value
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {value === "signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <TextField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" loading={submitting} className="w-full">
                {isSignup ? "Create account" : "Sign in"}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {isSignup
                ? "Already have an account? Switch to sign in above."
                : "New here? Switch to sign up — it takes a few seconds."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
