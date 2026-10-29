import { useState } from "react";
import { LogOut, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui";

export function AccountView() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Signed in as</p>
            <p className="truncate font-medium text-foreground">
              {user?.email ?? "your account"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Your data is private
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Every habit and check-in is tied to your account and protected at the database level —
              no one else can read or change it.
            </p>
          </div>
        </div>
      </div>

      <Button
        variant="danger"
        size="lg"
        className="w-full"
        onClick={handleSignOut}
        loading={signingOut}
      >
        {!signingOut && <LogOut className="size-4" aria-hidden="true" />} Sign out
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        HabitLoop · built for small daily wins
      </p>
    </div>
  );
}
