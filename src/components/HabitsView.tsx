import { useState } from "react";
import { Archive, ArchiveRestore, ChevronRight, Pencil, Plus, Sparkles } from "lucide-react";
import { useHabits } from "../context/HabitsContext";
import { describeTarget } from "../lib/habits";
import type { Tracker } from "../types";
import { Button, ListSkeleton, cn } from "./ui";

interface HabitsViewProps {
  onCreateHabit: () => void;
  onEditHabit: (id: string) => void;
  onOpenHabit: (id: string) => void;
}

export function HabitsView({ onCreateHabit, onEditHabit, onOpenHabit }: HabitsViewProps) {
  const { trackers, loading, setArchived } = useHabits();
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const habits = trackers.filter((tracker) => tracker.type === "habit");
  const active = habits.filter((tracker) => !tracker.archived);
  const archived = habits.filter((tracker) => tracker.archived);
  const list = showArchived ? archived : active;

  async function toggleArchive(tracker: Tracker) {
    setBusyId(tracker.id);
    try {
      await setArchived(tracker.id, !tracker.archived);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <ListSkeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div
          className="inline-flex rounded-xl bg-muted p-1"
          role="group"
          aria-label="Filter habits by status"
        >
          {[
            { key: false, label: "Active" },
            { key: true, label: archived.length ? `Archived (${archived.length})` : "Archived" },
          ].map(({ key, label }) => (
            <button
              key={String(key)}
              type="button"
              onClick={() => setShowArchived(key)}
              aria-pressed={showArchived === key}
              className={cn(
                "press cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold",
                showArchived === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={onCreateHabit}>
          <Plus className="size-4" aria-hidden="true" /> New
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          mode={showArchived ? "archived-empty" : habits.length === 0 ? "no-habits" : "no-active"}
          onCreateHabit={onCreateHabit}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((habit) => (
            <li
              key={habit.id}
              className="flex items-center gap-1 rounded-2xl border border-border bg-card p-2 pl-3 shadow-sm"
            >
              <button
                type="button"
                onClick={() => onOpenHabit(habit.id)}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{habit.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {describeTarget(habit.config)}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onEditHabit(habit.id)}
                aria-label={`Edit ${habit.name}`}
                className="press flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Pencil className="size-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => toggleArchive(habit)}
                disabled={busyId === habit.id}
                aria-label={habit.archived ? `Restore ${habit.name}` : `Archive ${habit.name}`}
                className="press flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                {habit.archived ? (
                  <ArchiveRestore className="size-4" aria-hidden="true" />
                ) : (
                  <Archive className="size-4" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({
  mode,
  onCreateHabit,
}: {
  mode: "no-habits" | "no-active" | "archived-empty";
  onCreateHabit: () => void;
}) {
  if (mode === "no-habits") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-6" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-foreground">No habits yet</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Pick something small you can do most days. You can rename or archive it any time.
        </p>
        <Button className="mt-5" onClick={onCreateHabit}>
          <Plus className="size-4" aria-hidden="true" /> Create a habit
        </Button>
      </div>
    );
  }

  if (mode === "no-active") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Nothing active right now
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          All of your habits are archived. Head to the Archived tab to restore one, or create a new
          habit.
        </p>
        <Button variant="secondary" className="mt-5" onClick={onCreateHabit}>
          <Plus className="size-4" aria-hidden="true" /> New habit
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <h2 className="font-heading text-base font-semibold text-foreground">Nothing archived</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
        Archived habits will collect here so your active list stays focused.
      </p>
    </div>
  );
}
