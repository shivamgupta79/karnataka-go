import { useMemo, useState } from "react";
import { AlertTriangle, Check, Flame, Plus, RotateCw, Sparkles } from "lucide-react";
import { useHabits } from "../context/HabitsContext";
import { todayKey } from "../lib/dates";
import { describeTarget } from "../lib/habits";
import { currentStreak } from "../lib/streaks";
import type { Tracker } from "../types";
import { Button, ListSkeleton, Toast, cn } from "./ui";

interface TodayViewProps {
  onCreateHabit: () => void;
  onOpenHabit: (id: string) => void;
}

export function TodayView({ onCreateHabit, onOpenHabit }: TodayViewProps) {
  const { trackers, entries, loading, toggleEntry } = useHabits();
  const today = todayKey();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const doneByTracker = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const entry of entries) {
      const set = map.get(entry.tracker_id) ?? new Set<string>();
      set.add(entry.entry_date);
      map.set(entry.tracker_id, set);
    }
    return map;
  }, [entries]);

  const habits = useMemo(
    () => trackers.filter((tracker) => tracker.type === "habit" && !tracker.archived),
    [trackers],
  );

  const doneToday = habits.reduce(
    (count, habit) => count + (doneByTracker.get(habit.id)?.has(today) ? 1 : 0),
    0,
  );
  const allDone = habits.length > 0 && doneToday === habits.length;

  async function handleToggle(habit: Tracker) {
    if (pendingId) return;
    const done = doneByTracker.get(habit.id)?.has(today) ?? false;
    setErrorId(null);
    setPendingId(habit.id);
    try {
      await toggleEntry(habit.id, today, !done);
      if (!done && doneToday + 1 === habits.length) setCelebrate(true);
    } catch {
      setErrorId(habit.id);
    } finally {
      setPendingId(null);
    }
  }

  if (loading) return <ListSkeleton rows={3} />;

  if (habits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-foreground">Your day is a blank slate</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Add one small habit to start — then check it off each day. That's the whole loop.
        </p>
        <Button className="mt-5" onClick={onCreateHabit}>
          <Plus className="size-4" aria-hidden="true" /> Create your first habit
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Today&apos;s progress</p>
          <p className="text-sm font-semibold text-foreground">
            {doneToday}/{habits.length}
          </p>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={doneToday}
          aria-valuemin={0}
          aria-valuemax={habits.length}
          aria-label="Habits completed today"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${(doneToday / habits.length) * 100}%` }}
          />
        </div>
        {allDone && (
          <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-accent">
            <Sparkles className="size-4" aria-hidden="true" /> Every habit done — nice work today.
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {habits.map((habit) => {
          const doneSet = doneByTracker.get(habit.id);
          const done = doneSet?.has(today) ?? false;
          const streak = currentStreak(doneSet ?? new Set<string>(), today);
          const isPending = pendingId === habit.id;
          const hasError = errorId === habit.id;

          return (
            <li key={habit.id}>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors",
                  done ? "border-accent/40" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(habit)}
                  disabled={isPending}
                  aria-pressed={done}
                  aria-label={
                    done
                      ? `Mark ${habit.name} as not done today`
                      : `Mark ${habit.name} as done today`
                  }
                  className={cn(
                    "press flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2",
                    done
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-muted/40 text-transparent hover:border-primary/60",
                    isPending && "opacity-60",
                  )}
                >
                  {done && <Check className="size-6 animate-pop stroke-[3]" aria-hidden="true" />}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenHabit(habit.id)}
                  className="flex min-w-0 flex-1 cursor-pointer flex-col items-start text-left"
                >
                  <span
                    className={cn(
                      "truncate font-medium",
                      done ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {habit.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {describeTarget(habit.config)}
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                  <Flame className="size-3.5 text-accent" aria-hidden="true" />
                  <span aria-hidden="true">{streak}</span>
                  <span className="sr-only">
                    {streak} day{streak === 1 ? "" : "s"} streak
                  </span>
                </div>
              </div>

              {hasError && (
                <div
                  role="alert"
                  className="mt-2 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">Couldn&apos;t save that check-in — check your connection.</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(habit)}
                    className="press inline-flex cursor-pointer items-center gap-1 font-semibold"
                  >
                    <RotateCw className="size-3.5" aria-hidden="true" /> Retry
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Button variant="secondary" size="lg" className="w-full" onClick={onCreateHabit}>
        <Plus className="size-4" aria-hidden="true" /> Add a habit
      </Button>

      {celebrate && (
        <Toast onDismiss={() => setCelebrate(false)}>
          <Sparkles className="size-4" aria-hidden="true" /> All done for today!
        </Toast>
      )}
    </div>
  );
}
