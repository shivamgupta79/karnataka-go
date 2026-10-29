import type { ReactNode } from "react";
import { ArrowLeft, CalendarCheck, Infinity as LoopIcon, ListChecks, User } from "lucide-react";
import { cn } from "./ui";

export type TabKey = "today" | "habits" | "account";

const TABS: { key: TabKey; label: string; icon: typeof CalendarCheck }[] = [
  { key: "today", label: "Today", icon: CalendarCheck },
  { key: "habits", label: "Habits", icon: ListChecks },
  { key: "account", label: "Account", icon: User },
];

interface AppShellProps {
  activeTab: TabKey;
  onTab: (tab: TabKey) => void;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  activeTab,
  onTab,
  title,
  subtitle,
  onBack,
  action,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="press -ml-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground hover:bg-muted"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
              <LoopIcon className="size-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-lg font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pb-28 pt-4">{children}</main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur"
      >
        <div className="pb-safe mx-auto flex w-full max-w-xl">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = key === activeTab;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTab(key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press flex flex-1 cursor-pointer flex-col items-center gap-1 py-2 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/12",
                  )}
                >
                  <Icon className={cn("size-5", active && "stroke-[2.25]")} aria-hidden="true" />
                </span>
                <span className={active ? "font-semibold" : undefined}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
