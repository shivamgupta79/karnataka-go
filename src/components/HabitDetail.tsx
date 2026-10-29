import { useMemo, useState } from "react";
import { AlertTriangle, Archive, ArchiveRestore, Flame, Pencil, Trophy } from "lucide-react";
import { useHabits } from "../context/HabitsContext";
import { lastNDaysKeys, todayKey } from "../lib/dates";
import { describeTarget } from "../lib/habits";
import { completedInWindow, currentStreak, longestStreak } from "../lib/streaks";
import { Button, cn } from "./ui";
import { ConsistencyGrid } from "./ConsistencyGrid";

interface HabitDetailProps {
  habitId: string;
  onEdit: () => void;
}

export function HabitDetail({ habitId, onEdit }: HabitDetailProps) {
  const { trackers, entries, toggleEntry, setArchived } = useHabits();
  const habit = trackers.find((tracker) => tracker.id === habitId) ?? null;
  const today = todayKey();

  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [errorDate, setErrorDate] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const doneDates = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) if (entry.tracker_id === habitId) set.add(entry.entry_date);
    return set;
  }, [entries, habitId]);

  const window30 = useMemo(() => lastNDaysKeys(30, today), [today]);
  const current = currentStreak(doneDates, today);
  const longest = longestStreak(doneDates);
  const last30 = completedInWindow(doneDates, window30);

  if (!habit) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">This habit is no longer available.</p>
      </div>
    );
  }

  const habitRecord = habit;

  async function handleToggle(dateKey: string, nextDone: boolean) {
    setErrorDate(null);
    setPendingDate(dateKey);
    try {
      await toggleEntry(habitId, dateKey, nextDone);
    } catch {
      setErrorDate(dateKey);
    } finally {
      setPendingDate(null);
    }
  }

  async function handleArchiveToggle() {
    setArchiving(true);
    try {
      await setArchived(habitId, !habitRecord.archived);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-foreground">{habitRecord.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{describeTarget(habitRecord.config)}</p>
        {habitRecord.archived && (
          <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Archived
          </span>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <StatCard icon={Flame} label="Current streak" value={current} accent />
          <StatCard icon={Trophy} label="Longest streak" value={longest} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="font-heading text-base font-semibold text-foreground">Last 30 days</h3>
          <span className="text-xs font-medium text-muted-foreground">{last30} of 30 done</span>
        </div>

        <ConsistencyGrid
          doneDates={doneDates}
          today={today}
          onToggle={handleToggle}
          pendingDate={pendingDate}
        />

        {errorDate && (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            <span>Couldn&apos;t save that day — check your connection and tap again.</span>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Tap any day to mark it done or undo it — great for back-filling a missed day.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" className="flex-1" onClick={onEdit}>
          <Pencil className="size-4" aria-hidden="true" /> Edit habit
        </Button>
        <Button
          variant={habitRecord.archived ? "ghost" : "danger"}
          className="flex-1"
          onClick={handleArchiveToggle}
          loading={archiving}
        >
          {habitRecord.archived ? (
            <ArchiveRestore className="size-4" aria-hidden="true" />
          ) : (
            <Archive className="size-4" aria-hidden="true" />
          )}
          {habitRecord.archived ? "Restore habit" : "Archive habit"}
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Flame;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        accent ? "border-accent/40 bg-accent/10" : "border-border bg-muted/40",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className={cn("size-4", accent ? "text-accent" : "text-primary")} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 font-heading text-2xl font-bold text-foreground">
        {value}
        <span className="ml-1 text-sm font-medium text-muted-foreground">
          day{value === 1 ? "" : "s"}
        </span>
      </p>
    </div>
  );
}
