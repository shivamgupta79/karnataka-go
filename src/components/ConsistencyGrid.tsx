import { Check } from "lucide-react";
import { formatDayNumber, formatMonthDay, lastNDaysKeys } from "../lib/dates";
import { cn } from "./ui";

interface ConsistencyGridProps {
  doneDates: Set<string>;
  today: string;
  days?: number;
  onToggle: (dateKey: string, nextDone: boolean) => void;
  pendingDate: string | null;
}

export function ConsistencyGrid({
  doneDates,
  today,
  days = 30,
  onToggle,
  pendingDate,
}: ConsistencyGridProps) {
  const keys = lastNDaysKeys(days, today);

  return (
    <div>
      <ul className="grid grid-cols-6 gap-2 sm:grid-cols-10">
        {keys.map((key) => {
          const done = doneDates.has(key);
          const isToday = key === today;
          const isPending = pendingDate === key;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onToggle(key, !done)}
                disabled={isPending}
                aria-pressed={done}
                aria-label={`${formatMonthDay(key)} — ${
                  done ? "done, tap to undo" : "not done, tap to mark done"
                }`}
                title={formatMonthDay(key)}
                className={cn(
                  "press relative flex aspect-square w-full cursor-pointer items-center justify-center rounded-xl border text-xs font-semibold",
                  done
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/60",
                  isToday && "ring-2 ring-primary",
                  isPending && "opacity-60",
                )}
              >
                <span aria-hidden="true">{formatDayNumber(key)}</span>
                {done && (
                  <Check
                    className="absolute right-1 top-1 size-3 stroke-[3]"
                    aria-hidden="true"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="flex size-4 items-center justify-center rounded border border-accent bg-accent text-white">
            <Check className="size-3 stroke-[3]" aria-hidden="true" />
          </span>
          Done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-4 rounded border border-border bg-muted/40" aria-hidden="true" />
          Not done
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-4 rounded border border-border ring-2 ring-primary" aria-hidden="true" />
          Today
        </span>
      </div>
    </div>
  );
}
