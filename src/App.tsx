import { useState, type ReactNode } from "react";
import { AlertTriangle, Infinity as LoopIcon, Plus } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { HabitsProvider, useHabits } from "./context/HabitsContext";
import { isSupabaseConfigured } from "./lib/supabase";
import { formatLongDate } from "./lib/dates";
import { AppShell, type TabKey } from "./components/AppShell";
import { AuthScreen } from "./components/AuthScreen";
import { TodayView } from "./components/TodayView";
import { HabitsView } from "./components/HabitsView";
import { HabitDetail } from "./components/HabitDetail";
import { HabitFormModal } from "./components/HabitFormModal";
import { AccountView } from "./components/AccountView";
import { Button, Spinner } from "./components/ui";

type Route = { name: "tab"; tab: TabKey } | { name: "habit"; id: string };

export default function App() {
  if (!isSupabaseConfigured) return <ConfigMissing />;

  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}

function Root() {
  const { session, user, loading } = useAuth();

  if (loading) {
    return (
      <Splash>
        <Spinner className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">Restoring your session…</p>
      </Splash>
    );
  }

  // Unauthenticated (or session expired) users only ever see the auth screen.
  if (!session || !user) return <AuthScreen />;

  return (
    <HabitsProvider userId={user.id}>
      <SignedInApp />
    </HabitsProvider>
  );
}

function SignedInApp() {
  const { trackers } = useHabits();
  const [route, setRoute] = useState<Route>({ name: "tab", tab: "today" });
  const [form, setForm] = useState<{ open: boolean; editingId: string | null }>({
    open: false,
    editingId: null,
  });

  const isDetail = route.name === "habit";
  const detail = isDetail ? trackers.find((tracker) => tracker.id === route.id) ?? null : null;
  const activeTab: TabKey = isDetail ? "habits" : route.tab;

  const goTab = (tab: TabKey) => setRoute({ name: "tab", tab });
  const openHabit = (id: string) => setRoute({ name: "habit", id });
  const openCreate = () => setForm({ open: true, editingId: null });
  const openEdit = (id: string) => setForm({ open: true, editingId: id });
  const closeForm = () => setForm({ open: false, editingId: null });

  const headerTitle = isDetail
    ? detail?.name ?? "Habit"
    : route.name === "tab" && route.tab === "habits"
      ? "Habits"
      : route.name === "tab" && route.tab === "account"
        ? "Account"
        : "HabitLoop";

  const headerSubtitle =
    !isDetail && route.name === "tab" && route.tab === "today" ? formatLongDate() : undefined;

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onTab={goTab}
        onBack={isDetail ? () => goTab("habits") : undefined}
        title={headerTitle}
        subtitle={headerSubtitle}
        action={
          !isDetail && route.name === "tab" && route.tab === "today" ? (
            <Button size="sm" onClick={openCreate} aria-label="Add habit">
              <Plus className="size-4" aria-hidden="true" /> Add
            </Button>
          ) : undefined
        }
      >
        {isDetail && route.name === "habit" ? (
          <HabitDetail habitId={route.id} onEdit={() => openEdit(route.id)} />
        ) : route.name === "tab" && route.tab === "today" ? (
          <TodayView onCreateHabit={openCreate} onOpenHabit={openHabit} />
        ) : route.name === "tab" && route.tab === "habits" ? (
          <HabitsView onCreateHabit={openCreate} onEditHabit={openEdit} onOpenHabit={openHabit} />
        ) : (
          <AccountView />
        )}
      </AppShell>

      <HabitFormModal open={form.open} editingId={form.editingId} onClose={closeForm} />
    </>
  );
}

function Splash({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-md">
        <LoopIcon className="size-7" aria-hidden="true" />
      </span>
      {children}
    </div>
  );
}

function ConfigMissing() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-destructive/40 bg-card p-6 text-center shadow-sm">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Almost there — configuration needed
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          HabitLoop needs its Supabase URL and publishable key in the environment settings before it
          can connect.
        </p>
      </div>
    </div>
  );
}
